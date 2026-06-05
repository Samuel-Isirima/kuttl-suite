package services

import (
	"context"
	"fmt"
	"log"
	"math"
	"strings"

	"api.kuttl.xyz/internal/database"
	"api.kuttl.xyz/internal/models"
	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// Embedding Service
// ─────────────────────────────────────────────

type EmbeddingService struct {
	snapshots *database.SnapshotRepository
	ai        AIProvider
	config    EmbeddingConfig
}

type EmbeddingConfig struct {
	Model               string  `json:"model"`
	MaxTokens           int     `json:"max_tokens"`
	ChunkSize           int     `json:"chunk_size"`
	OverlapSize         int     `json:"overlap_size"`
	BatchSize           int     `json:"batch_size"`
	SimilarityThreshold float32 `json:"similarity_threshold"`
}

type AIProvider interface {
	GenerateEmbedding(ctx context.Context, content string, model string) ([]float32, int, error)
	GenerateEmbeddings(ctx context.Context, contents []string, model string) ([][]float32, []int, error)
}

func NewEmbeddingService(snapshots *database.SnapshotRepository, ai AIProvider) *EmbeddingService {
	return &EmbeddingService{
		snapshots: snapshots,
		ai:        ai,
		config: EmbeddingConfig{
			Model:               "text-embedding-3-small", // Default OpenAI model
			MaxTokens:           8191,
			ChunkSize:           1000,
			OverlapSize:         100,
			BatchSize:           10,
			SimilarityThreshold: 0.8,
		},
	}
}

func (s *EmbeddingService) SetConfig(config EmbeddingConfig) {
	s.config = config
}

// ─────────────────────────────────────────────
// Main Embedding Generation
// ─────────────────────────────────────────────

func (s *EmbeddingService) ProcessSnapshot(ctx context.Context, snapshotID uuid.UUID) error {
	log.Printf("Processing snapshot %s for embeddings", snapshotID)

	// Get the snapshot
	snapshot, err := s.snapshots.GetSnapshot(snapshotID)
	if err != nil {
		return fmt.Errorf("failed to get snapshot: %w", err)
	}

	// Generate embeddings for different aspects
	embeddings := []*models.EmbeddingVector{}

	// 1. Full snapshot embedding
	fullEmbedding, err := s.generateFullSnapshotEmbedding(ctx, snapshot)
	if err != nil {
		log.Printf("Warning: failed to generate full snapshot embedding: %v", err)
	} else {
		embeddings = append(embeddings, fullEmbedding)
	}

	// 2. Component embeddings
	componentEmbeddings, err := s.generateComponentEmbeddings(ctx, snapshot)
	if err != nil {
		log.Printf("Warning: failed to generate component embeddings: %v", err)
	} else {
		embeddings = append(embeddings, componentEmbeddings...)
	}

	// 3. Style pattern embedding
	styleEmbedding, err := s.generateStyleEmbedding(ctx, snapshot)
	if err != nil {
		log.Printf("Warning: failed to generate style embedding: %v", err)
	} else {
		embeddings = append(embeddings, styleEmbedding)
	}

	// 4. Layout structure embedding
	layoutEmbedding, err := s.generateLayoutEmbedding(ctx, snapshot)
	if err != nil {
		log.Printf("Warning: failed to generate layout embedding: %v", err)
	} else {
		embeddings = append(embeddings, layoutEmbedding)
	}

	// Store all embeddings
	for _, embedding := range embeddings {
		if err := s.snapshots.CreateEmbedding(embedding); err != nil {
			log.Printf("Warning: failed to store embedding %s: %v", embedding.ID, err)
		}
	}

	log.Printf("Successfully processed snapshot %s, generated %d embeddings", snapshotID, len(embeddings))
	return nil
}

// ─────────────────────────────────────────────
// Full Snapshot Embedding
// ─────────────────────────────────────────────

func (s *EmbeddingService) generateFullSnapshotEmbedding(ctx context.Context, snapshot *models.WebsiteSnapshot) (*models.EmbeddingVector, error) {
	// Create a comprehensive text representation of the entire snapshot
	content := s.buildFullSnapshotText(snapshot)

	// Chunk if too long
	chunks := s.chunkText(content, s.config.ChunkSize, s.config.OverlapSize)

	var finalVector []float32
	var totalTokens int

	if len(chunks) == 1 {
		// Single embedding
		vector, tokens, err := s.ai.GenerateEmbedding(ctx, chunks[0], s.config.Model)
		if err != nil {
			return nil, err
		}
		finalVector = vector
		totalTokens = tokens
	} else {
		// Average multiple chunk embeddings
		vectors, tokenCounts, err := s.ai.GenerateEmbeddings(ctx, chunks, s.config.Model)
		if err != nil {
			return nil, err
		}
		finalVector = s.averageVectors(vectors)
		for _, tokens := range tokenCounts {
			totalTokens += tokens
		}
	}

	return &models.EmbeddingVector{
		ID:         uuid.New(),
		SnapshotID: snapshot.ID,
		WebsiteID:  snapshot.WebsiteID,
		VectorType: "full",
		TargetID:   snapshot.ID.String(),
		Vector:     models.Float32Array(finalVector),
		Dimensions: len(finalVector),
		Model:      s.config.Model,
		TokenCount: totalTokens,
		Content:    content,
		Metadata: models.EmbeddingMetadata{
			ComponentType:     "snapshot",
			SemanticRole:      "website-state",
			HasCustomizations: len(snapshot.Customizations.Patches) > 0,
			InteractionLevel:  "full-website",
			VisibilityState:   "complete",
			LayoutRole:        "root",
			AIGenerated:       false,
			UserModified:      len(snapshot.Customizations.Patches) > 0,
			Tags:              []string{"full-snapshot", "website-state"},
		},
	}, nil
}

func (s *EmbeddingService) buildFullSnapshotText(snapshot *models.WebsiteSnapshot) string {
	var builder strings.Builder

	// Metadata summary
	builder.WriteString(fmt.Sprintf("Website Snapshot %s:\n", snapshot.Version))
	builder.WriteString(fmt.Sprintf("Website: %s\n", snapshot.WebsiteID))
	builder.WriteString(fmt.Sprintf("Components: %d\n", len(snapshot.Components)))
	builder.WriteString(fmt.Sprintf("Patches: %d\n", len(snapshot.Customizations.Patches)))

	// Page info
	if snapshot.Metadata.PageInfo.Title != "" {
		builder.WriteString(fmt.Sprintf("Page Title: %s\n", snapshot.Metadata.PageInfo.Title))
	}
	if snapshot.Metadata.PageInfo.URL != "" {
		builder.WriteString(fmt.Sprintf("URL: %s\n", snapshot.Metadata.PageInfo.URL))
	}

	builder.WriteString("\nComponent Structure:\n")

	// Component hierarchy
	for i, component := range snapshot.Components {
		if i >= 20 { // Limit to first 20 components for token management
			builder.WriteString("... and more components\n")
			break
		}

		indent := s.getComponentIndent(component, snapshot.Components)
		builder.WriteString(fmt.Sprintf("%s<%s>", indent, component.Element.Tag))

		if component.Element.AccessibilityInfo.Role != "" && component.Element.AccessibilityInfo.Role != component.Element.Tag {
			builder.WriteString(fmt.Sprintf(" role=%s", component.Element.AccessibilityInfo.Role))
		}

		if component.Element.AccessibilityInfo.Label != "" {
			builder.WriteString(fmt.Sprintf(" label=\"%s\"", component.Element.AccessibilityInfo.Label))
		}

		// Key styles
		keyStyles := []string{}
		if component.Element.Styles["display"] != "" {
			keyStyles = append(keyStyles, fmt.Sprintf("display:%s", component.Element.Styles["display"]))
		}
		if component.Element.Styles["position"] != "" && component.Element.Styles["position"] != "static" {
			keyStyles = append(keyStyles, fmt.Sprintf("position:%s", component.Element.Styles["position"]))
		}
		if len(keyStyles) > 0 {
			builder.WriteString(fmt.Sprintf(" style=\"%s\"", strings.Join(keyStyles, "; ")))
		}

		builder.WriteString("\n")
	}

	// Customizations
	if len(snapshot.Customizations.Patches) > 0 {
		builder.WriteString("\nCustomizations:\n")
		for i, patch := range snapshot.Customizations.Patches {
			if i >= 10 { // Limit patches
				builder.WriteString("... and more customizations\n")
				break
			}
			builder.WriteString(fmt.Sprintf("- %s on %s (source: %s)\n",
				patch.Op, patch.Target, patch.Source))
		}
	}

	return builder.String()
}

// ─────────────────────────────────────────────
// Component Embeddings
// ─────────────────────────────────────────────

func (s *EmbeddingService) generateComponentEmbeddings(ctx context.Context, snapshot *models.WebsiteSnapshot) ([]*models.EmbeddingVector, error) {
	var embeddings []*models.EmbeddingVector

	// Process components in batches
	for i := 0; i < len(snapshot.Components); i += s.config.BatchSize {
		end := i + s.config.BatchSize
		if end > len(snapshot.Components) {
			end = len(snapshot.Components)
		}

		batch := snapshot.Components[i:end]
		batchEmbeddings, err := s.generateComponentBatch(ctx, snapshot, batch)
		if err != nil {
			log.Printf("Warning: failed to process component batch %d-%d: %v", i, end-1, err)
			continue
		}

		embeddings = append(embeddings, batchEmbeddings...)
	}

	return embeddings, nil
}

func (s *EmbeddingService) generateComponentBatch(ctx context.Context, snapshot *models.WebsiteSnapshot, components []models.ComponentState) ([]*models.EmbeddingVector, error) {
	contents := make([]string, len(components))

	for i, component := range components {
		contents[i] = s.buildComponentText(component, snapshot)
	}

	vectors, tokenCounts, err := s.ai.GenerateEmbeddings(ctx, contents, s.config.Model)
	if err != nil {
		return nil, err
	}

	embeddings := make([]*models.EmbeddingVector, len(components))
	for i, component := range components {
		embeddings[i] = &models.EmbeddingVector{
			ID:         uuid.New(),
			SnapshotID: snapshot.ID,
			WebsiteID:  snapshot.WebsiteID,
				VectorType: "component",
			TargetID:   component.UID,
			Vector:     models.Float32Array(vectors[i]),
			Dimensions: len(vectors[i]),
			Model:      s.config.Model,
			TokenCount: tokenCounts[i],
			Content:    contents[i],
			Metadata: models.EmbeddingMetadata{
				ComponentType:     component.Element.Tag,
				SemanticRole:      component.Element.AccessibilityInfo.Role,
				HasCustomizations: s.componentHasCustomizations(component, snapshot),
				InteractionLevel:  s.getInteractionLevel(component),
				VisibilityState:   s.getVisibilityState(component),
				LayoutRole:        s.getLayoutRole(component),
				AIGenerated:       false,
				UserModified:      s.componentHasCustomizations(component, snapshot),
				Tags:              s.generateComponentTags(component),
			},
		}
	}

	return embeddings, nil
}

func (s *EmbeddingService) buildComponentText(component models.ComponentState, snapshot *models.WebsiteSnapshot) string {
	var builder strings.Builder

	// Basic element info
	builder.WriteString(fmt.Sprintf("<%s", component.Element.Tag))

	if component.Element.AccessibilityInfo.Role != "" && component.Element.AccessibilityInfo.Role != component.Element.Tag {
		builder.WriteString(fmt.Sprintf(" role=\"%s\"", component.Element.AccessibilityInfo.Role))
	}

	if component.Element.AccessibilityInfo.Label != "" {
		builder.WriteString(fmt.Sprintf(" aria-label=\"%s\"", component.Element.AccessibilityInfo.Label))
	}

	if component.Element.AccessibilityInfo.Description != "" {
		builder.WriteString(fmt.Sprintf(" aria-description=\"%s\"", component.Element.AccessibilityInfo.Description))
	}

	// Key attributes
	for key, value := range component.Element.Attributes {
		if s.isImportantAttribute(key) && value != "" {
			builder.WriteString(fmt.Sprintf(" %s=\"%s\"", key, value))
		}
	}

	builder.WriteString(">")

	// Visual state
	if component.VisualState.IsHidden {
		builder.WriteString(" [HIDDEN]")
	}
	if !component.VisualState.IsVisible {
		builder.WriteString(" [NOT_VISIBLE]")
	}

	// Layout information
	if len(component.Element.Children) > 0 {
		builder.WriteString(fmt.Sprintf(" Contains %d children.", len(component.Element.Children)))
	}

	// Interaction capabilities
	if component.Interactions.IsInteractive {
		builder.WriteString(" Interactive element.")
		if len(component.Interactions.SupportedEvents) > 0 {
			builder.WriteString(fmt.Sprintf(" Supports: %s.", strings.Join(component.Interactions.SupportedEvents, ", ")))
		}
	}

	// Customization info
	customizations := s.getComponentCustomizations(component, snapshot)
	if len(customizations) > 0 {
		builder.WriteString(" Customized: ")
		for i, patch := range customizations {
			if i > 0 {
				builder.WriteString(", ")
			}
			builder.WriteString(patch.Op)
		}
		builder.WriteString(".")
	}

	return builder.String()
}

// ─────────────────────────────────────────────
// Style Pattern Embedding
// ─────────────────────────────────────────────

func (s *EmbeddingService) generateStyleEmbedding(ctx context.Context, snapshot *models.WebsiteSnapshot) (*models.EmbeddingVector, error) {
	content := s.buildStyleText(snapshot)

	vector, tokens, err := s.ai.GenerateEmbedding(ctx, content, s.config.Model)
	if err != nil {
		return nil, err
	}

	return &models.EmbeddingVector{
		ID:         uuid.New(),
		SnapshotID: snapshot.ID,
		WebsiteID:  snapshot.WebsiteID,
		VectorType: "style",
		TargetID:   snapshot.ID.String() + "-styles",
		Vector:     models.Float32Array(vector),
		Dimensions: len(vector),
		Model:      s.config.Model,
		TokenCount: tokens,
		Content:    content,
		Metadata: models.EmbeddingMetadata{
			ComponentType:     "styles",
			SemanticRole:      "design-system",
			HasCustomizations: s.hasStyleCustomizations(snapshot),
			InteractionLevel:  "visual",
			VisibilityState:   "design-tokens",
			LayoutRole:        "appearance",
			AIGenerated:       false,
			UserModified:      s.hasStyleCustomizations(snapshot),
			Tags:              []string{"styles", "design-tokens", "visual-design"},
		},
	}, nil
}

func (s *EmbeddingService) buildStyleText(snapshot *models.WebsiteSnapshot) string {
	var builder strings.Builder

	builder.WriteString("Style System:\n")

	// Design tokens
	if len(snapshot.Styles.DesignTokens.Colors) > 0 {
		builder.WriteString("Colors: ")
		colors := []string{}
		for name, value := range snapshot.Styles.DesignTokens.Colors {
			colors = append(colors, fmt.Sprintf("%s: %s", name, value))
		}
		builder.WriteString(strings.Join(colors, ", "))
		builder.WriteString("\n")
	}

	if len(snapshot.Styles.DesignTokens.Typography) > 0 {
		builder.WriteString("Typography: ")
		for name, typo := range snapshot.Styles.DesignTokens.Typography {
			builder.WriteString(fmt.Sprintf("%s: %s %.0fpx, ", name, typo.FontFamily, typo.FontSize))
		}
		builder.WriteString("\n")
	}

	// Global rules (sample)
	if len(snapshot.Styles.GlobalRules) > 0 {
		builder.WriteString("CSS Rules:\n")
		for i, rule := range snapshot.Styles.GlobalRules {
			if i >= 10 { // Limit rules
				builder.WriteString("... and more rules\n")
				break
			}
			builder.WriteString(fmt.Sprintf("- %s: ", rule.Selector))
			props := []string{}
			for prop, value := range rule.Properties {
				props = append(props, fmt.Sprintf("%s: %s", prop, value))
				if len(props) >= 3 { // Limit properties per rule
					props = append(props, "...")
					break
				}
			}
			builder.WriteString(strings.Join(props, "; "))
			builder.WriteString("\n")
		}
	}

	// Custom CSS
	if snapshot.Styles.CustomCSS != "" {
		builder.WriteString(fmt.Sprintf("Custom CSS: %s\n", s.truncateText(snapshot.Styles.CustomCSS, 200)))
	}

	return builder.String()
}

// ─────────────────────────────────────────────
// Layout Structure Embedding
// ─────────────────────────────────────────────

func (s *EmbeddingService) generateLayoutEmbedding(ctx context.Context, snapshot *models.WebsiteSnapshot) (*models.EmbeddingVector, error) {
	content := s.buildLayoutText(snapshot)

	vector, tokens, err := s.ai.GenerateEmbedding(ctx, content, s.config.Model)
	if err != nil {
		return nil, err
	}

	return &models.EmbeddingVector{
		ID:         uuid.New(),
		SnapshotID: snapshot.ID,
		WebsiteID:  snapshot.WebsiteID,
		VectorType: "layout",
		TargetID:   snapshot.ID.String() + "-layout",
		Vector:     models.Float32Array(vector),
		Dimensions: len(vector),
		Model:      s.config.Model,
		TokenCount: tokens,
		Content:    content,
		Metadata: models.EmbeddingMetadata{
			ComponentType:     "layout",
			SemanticRole:      "structure",
			HasCustomizations: s.hasLayoutCustomizations(snapshot),
			InteractionLevel:  "structural",
			VisibilityState:   "layout-system",
			LayoutRole:        "container",
			AIGenerated:       false,
			UserModified:      s.hasLayoutCustomizations(snapshot),
			Tags:              []string{"layout", "structure", "positioning"},
		},
	}, nil
}

func (s *EmbeddingService) buildLayoutText(snapshot *models.WebsiteSnapshot) string {
	var builder strings.Builder

	builder.WriteString(fmt.Sprintf("Layout System (%s):\n", snapshot.Layout.LayoutType))

	// Layout containers
	if len(snapshot.Layout.Containers) > 0 {
		builder.WriteString("Containers:\n")
		for i, container := range snapshot.Layout.Containers {
			if i >= 10 { // Limit containers
				builder.WriteString("... and more containers\n")
				break
			}

			builder.WriteString(fmt.Sprintf("- %s (%s): ", container.UID, container.Type))

			props := []string{}
			if container.Properties.Display != "" {
				props = append(props, fmt.Sprintf("display: %s", container.Properties.Display))
			}
			if container.Properties.FlexDirection != nil {
				props = append(props, fmt.Sprintf("flex-direction: %s", *container.Properties.FlexDirection))
			}
			if container.Properties.JustifyContent != nil {
				props = append(props, fmt.Sprintf("justify-content: %s", *container.Properties.JustifyContent))
			}

			builder.WriteString(strings.Join(props, ", "))
			builder.WriteString(fmt.Sprintf(" (%d children)", len(container.Children)))
			builder.WriteString("\n")
		}
	}

	// Responsive breakpoints
	if len(snapshot.Layout.Breakpoints) > 0 {
		builder.WriteString("Responsive Breakpoints:\n")
		for _, bp := range snapshot.Layout.Breakpoints {
			builder.WriteString(fmt.Sprintf("- %s: %.0fpx", bp.Name, bp.MinWidth))
			if bp.MaxWidth != nil {
				builder.WriteString(fmt.Sprintf("-%.0fpx", *bp.MaxWidth))
			}
			builder.WriteString(fmt.Sprintf(" (%d active, %d hidden)",
				len(bp.ActiveComponents), len(bp.HiddenComponents)))
			builder.WriteString("\n")
		}
	}

	// Stacking context
	if len(snapshot.Layout.StackingContext) > 0 {
		builder.WriteString("Z-Index Layers:\n")
		for i, layer := range snapshot.Layout.StackingContext {
			if i >= 5 { // Limit layers
				break
			}
			builder.WriteString(fmt.Sprintf("- z-index %d: %d components", layer.ZIndex, len(layer.Components)))
			builder.WriteString("\n")
		}
	}

	return builder.String()
}

// ─────────────────────────────────────────────
// Similarity and Search
// ─────────────────────────────────────────────

func (s *EmbeddingService) FindSimilarComponents(ctx context.Context, websiteID string, queryVector models.Float32Array, limit int) ([]*models.EmbeddingVector, error) {
	candidates, err := s.snapshots.FindSimilarEmbeddings(websiteID, queryVector, "component", limit*3)
	if err != nil {
		return nil, err
	}

	// Calculate similarities and sort
	similarities := make([]EmbeddingSimilarity, len(candidates))
	for i, candidate := range candidates {
		similarity := s.calculateCosineSimilarity(queryVector, candidate.Vector)
		similarities[i] = EmbeddingSimilarity{
			Embedding:  candidate,
			Similarity: similarity,
		}
	}

	// Sort by similarity
	for i := 0; i < len(similarities)-1; i++ {
		for j := i + 1; j < len(similarities); j++ {
			if similarities[i].Similarity < similarities[j].Similarity {
				similarities[i], similarities[j] = similarities[j], similarities[i]
			}
		}
	}

	// Return top results
	if len(similarities) > limit {
		similarities = similarities[:limit]
	}

	results := make([]*models.EmbeddingVector, len(similarities))
	for i, sim := range similarities {
		results[i] = sim.Embedding
	}

	return results, nil
}

type EmbeddingSimilarity struct {
	Embedding  *models.EmbeddingVector
	Similarity float32
}

func (s *EmbeddingService) GenerateQueryEmbedding(ctx context.Context, query string) (models.Float32Array, error) {
	vector, _, err := s.ai.GenerateEmbedding(ctx, query, s.config.Model)
	return models.Float32Array(vector), err
}

// ─────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────

func (s *EmbeddingService) chunkText(text string, chunkSize, overlapSize int) []string {
	if len(text) <= chunkSize {
		return []string{text}
	}

	chunks := []string{}
	start := 0

	for start < len(text) {
		end := start + chunkSize
		if end > len(text) {
			end = len(text)
		}

		chunk := text[start:end]
		chunks = append(chunks, chunk)

		if end == len(text) {
			break
		}

		start = end - overlapSize
		if start <= 0 {
			start = end
		}
	}

	return chunks
}

func (s *EmbeddingService) averageVectors(vectors [][]float32) []float32 {
	if len(vectors) == 0 {
		return nil
	}

	dimensions := len(vectors[0])
	averaged := make([]float32, dimensions)

	for _, vector := range vectors {
		for i, val := range vector {
			averaged[i] += val
		}
	}

	count := float32(len(vectors))
	for i := range averaged {
		averaged[i] /= count
	}

	return averaged
}

func (s *EmbeddingService) calculateCosineSimilarity(a, b models.Float32Array) float32 {
	if len(a) != len(b) {
		return 0
	}

	var dotProduct, normA, normB float32

	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (float32(math.Sqrt(float64(normA))) * float32(math.Sqrt(float64(normB))))
}

func (s *EmbeddingService) getComponentIndent(component models.ComponentState, allComponents []models.ComponentState) string {
	// Simple indentation based on hierarchy
	level := 0
	for _, other := range allComponents {
		if other.UID == component.UID {
			break
		}
		if contains(other.Element.Children, component.UID) {
			level++
		}
	}
	return strings.Repeat("  ", level)
}

func (s *EmbeddingService) componentHasCustomizations(component models.ComponentState, snapshot *models.WebsiteSnapshot) bool {
	for _, patch := range snapshot.Customizations.Patches {
		if patch.Target == component.UID {
			return true
		}
	}
	return false
}

func (s *EmbeddingService) getComponentCustomizations(component models.ComponentState, snapshot *models.WebsiteSnapshot) []models.PatchInfo {
	var patches []models.PatchInfo
	for _, patch := range snapshot.Customizations.Patches {
		if patch.Target == component.UID {
			patches = append(patches, patch)
		}
	}
	return patches
}

func (s *EmbeddingService) getInteractionLevel(component models.ComponentState) string {
	if component.Interactions.IsInteractive {
		return "interactive"
	}
	if component.Interactions.IsFocusable {
		return "focusable"
	}
	return "static"
}

func (s *EmbeddingService) getVisibilityState(component models.ComponentState) string {
	if component.VisualState.IsHidden {
		return "hidden"
	}
	if !component.VisualState.IsVisible {
		return "not-visible"
	}
	return "visible"
}

func (s *EmbeddingService) getLayoutRole(component models.ComponentState) string {
	if len(component.Element.Children) > 0 {
		return "container"
	}
	if component.Relationships.Parent != nil {
		return "child"
	}
	return "standalone"
}

func (s *EmbeddingService) generateComponentTags(component models.ComponentState) []string {
	tags := []string{component.Element.Tag}

	if component.Element.AccessibilityInfo.Role != "" {
		tags = append(tags, component.Element.AccessibilityInfo.Role)
	}

	if component.Interactions.IsInteractive {
		tags = append(tags, "interactive")
	}

	if len(component.Element.Children) > 0 {
		tags = append(tags, "container")
	}

	return tags
}

func (s *EmbeddingService) isImportantAttribute(key string) bool {
	important := []string{"id", "class", "type", "href", "src", "alt", "title", "placeholder", "value"}
	for _, attr := range important {
		if key == attr {
			return true
		}
	}
	return false
}

func (s *EmbeddingService) hasStyleCustomizations(snapshot *models.WebsiteSnapshot) bool {
	for _, patch := range snapshot.Customizations.Patches {
		if patch.Op == "restyle" || patch.Op == "addClass" || patch.Op == "removeClass" {
			return true
		}
	}
	return false
}

func (s *EmbeddingService) hasLayoutCustomizations(snapshot *models.WebsiteSnapshot) bool {
	for _, patch := range snapshot.Customizations.Patches {
		if patch.Op == "move" || patch.Op == "reorder" {
			return true
		}
	}
	return false
}

func (s *EmbeddingService) truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen-3] + "..."
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
