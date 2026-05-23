package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// Website Snapshot Models
// ─────────────────────────────────────────────

type WebsiteSnapshot struct {
	ID          uuid.UUID              `json:"id" db:"id"`
	WebsiteID   string                 `json:"website_id" db:"website_id"`
	UserID      uuid.UUID              `json:"user_id" db:"user_id"`
	SessionID   string                 `json:"session_id" db:"session_id"`
	Version     string                 `json:"version" db:"version"`
	Components  ComponentStateArray    `json:"components" db:"components"`
	Styles      StyleSnapshot          `json:"styles" db:"styles"`
	Layout      LayoutStructure        `json:"layout" db:"layout"`
	Customizations CustomizationLayer  `json:"customizations" db:"customizations"`
	Metadata    SnapshotMetadata       `json:"metadata" db:"metadata"`
	
	// Prompt tracking (new fields)
	PromptID    *uuid.UUID             `json:"prompt_id,omitempty" db:"prompt_id"`
	TriggerType string                 `json:"trigger_type" db:"trigger_type"`
	
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at" db:"updated_at"`
}

type SnapshotDiff struct {
	ID            uuid.UUID              `json:"id" db:"id"`
	FromSnapshot  uuid.UUID              `json:"from_snapshot" db:"from_snapshot"`
	ToSnapshot    uuid.UUID              `json:"to_snapshot" db:"to_snapshot"`
	WebsiteID     string                 `json:"website_id" db:"website_id"`
	UserID        uuid.UUID              `json:"user_id" db:"user_id"`
	FromVersion   string                 `json:"from_version" db:"from_version"`
	ToVersion     string                 `json:"to_version" db:"to_version"`
	Components    ComponentDiff          `json:"components" db:"components"`
	Styles        StyleDiff              `json:"styles" db:"styles"`
	Layout        LayoutDiff             `json:"layout" db:"layout"`
	Customizations CustomizationDiff    `json:"customizations" db:"customizations"`
	CreatedAt     time.Time              `json:"created_at" db:"created_at"`
}

// ─────────────────────────────────────────────
// Supporting Types
// ─────────────────────────────────────────────

type ComponentState struct {
	UID           string                    `json:"uid"`
	Element       SerializedElementNode     `json:"element"`
	VisualState   VisualState              `json:"visual_state"`
	Relationships ComponentRelationships   `json:"relationships"`
	Interactions  InteractionCapabilities  `json:"interactions"`
}

type SerializedElementNode struct {
	Tag              string                 `json:"tag"`
	Attributes       map[string]string      `json:"attributes"`
	Styles           map[string]string      `json:"styles"`
	Children         []string               `json:"children"`
	OriginalIndex    int                    `json:"original_index"`
	InitiallyHidden  bool                   `json:"initially_hidden"`
	ComputedStyles   map[string]string      `json:"computed_styles"`
	BoundingRect     SerializedRect         `json:"bounding_rect"`
	SemanticRole     string                 `json:"semantic_role"`
	AccessibilityInfo AccessibilityInfo     `json:"accessibility_info"`
}

type VisualState struct {
	IsVisible   bool                   `json:"is_visible"`
	IsHidden    bool                   `json:"is_hidden"`
	Opacity     float64                `json:"opacity"`
	Position    SerializedPosition     `json:"position"`
	Dimensions  SerializedDimensions   `json:"dimensions"`
	Colors      ColorPalette           `json:"colors"`
	Typography  TypographyInfo         `json:"typography"`
	Effects     VisualEffects          `json:"effects"`
}

type ComponentRelationships struct {
	Parent         *string  `json:"parent"`
	Children       []string `json:"children"`
	Siblings       []string `json:"siblings"`
	LayoutContainer *string `json:"layout_container"`
	LayoutChildren []string `json:"layout_children"`
	LabelledBy     *string  `json:"labelled_by"`
	DescribedBy    *string  `json:"described_by"`
	Controls       []string `json:"controls"`
}

type InteractionCapabilities struct {
	IsInteractive         bool                   `json:"is_interactive"`
	IsSelectable          bool                   `json:"is_selectable"`
	IsFocusable           bool                   `json:"is_focusable"`
	SupportedEvents       []string               `json:"supported_events"`
	CurrentState          InteractionState       `json:"current_state"`
	CustomizableProperties []CustomizableProperty `json:"customizable_properties"`
	Constraints           PropertyConstraints    `json:"constraints"`
}

type StyleSnapshot struct {
	GlobalRules      []CSSRuleSnapshot           `json:"global_rules"`
	ComponentStyles  map[string]ComponentStyle   `json:"component_styles"`
	DesignTokens     DesignTokens                `json:"design_tokens"`
	CustomCSS        string                      `json:"custom_css"`
}

type LayoutStructure struct {
	LayoutType        string                 `json:"layout_type"`
	Containers        []LayoutContainer      `json:"containers"`
	PositioningContext []PositioningContext  `json:"positioning_context"`
	Breakpoints       []ResponsiveBreakpoint `json:"breakpoints"`
	StackingContext   []StackingLayer        `json:"stacking_context"`
}

type CustomizationLayer struct {
	Patches                []PatchInfo              `json:"patches"`
	CustomizationHistory   []CustomizationEntry     `json:"customization_history"`
	ActiveContext          CustomizationContext     `json:"active_context"`
	CustomizationMetadata  CustomizationMetadata    `json:"customization_metadata"`
}

type SnapshotMetadata struct {
	Timestamp           int64                `json:"timestamp"`
	Version             string               `json:"version"`
	WebsiteID           string               `json:"website_id"`
	UserID              string               `json:"user_id"`
	SessionID           string               `json:"session_id"`
	CaptureMethod       string               `json:"capture_method"`
	BrowserInfo         BrowserInfo          `json:"browser_info"`
	ViewportInfo        ViewportInfo         `json:"viewport_info"`
	PerformanceMetrics  PerformanceMetrics   `json:"performance_metrics"`
	PageInfo            PageInfo             `json:"page_info"`
	ComponentCounts     ComponentCounts      `json:"component_counts"`
	CustomizationSummary CustomizationSummary `json:"customization_summary"`
}

type EmbeddingMetadata struct {
	ComponentType    string             `json:"component_type"`
	SemanticRole     string             `json:"semantic_role"`
	HasCustomizations bool              `json:"has_customizations"`
	InteractionLevel string             `json:"interaction_level"`
	VisibilityState  string             `json:"visibility_state"`
	LayoutRole       string             `json:"layout_role"`
	AIGenerated      bool               `json:"ai_generated"`
	UserModified     bool               `json:"user_modified"`
	Tags             []string           `json:"tags"`
}

// ─────────────────────────────────────────────
// Diff Types
// ─────────────────────────────────────────────

type ComponentDiff struct {
	Added     []ComponentState          `json:"added"`
	Modified  []ComponentModification   `json:"modified"`
	Removed   []string                  `json:"removed"`
	Reordered []ReorderOperation        `json:"reordered"`
}

type StyleDiff struct {
	GlobalRules map[string]interface{}    `json:"global_rules"`
	ComponentStyles map[string]interface{} `json:"component_styles"`
	DesignTokens map[string]interface{}   `json:"design_tokens"`
}

type LayoutDiff struct {
	Containers        map[string]interface{} `json:"containers"`
	PositioningChanges []PositioningChange    `json:"positioning_changes"`
	ResponsiveChanges  []ResponsiveChange     `json:"responsive_changes"`
}

type CustomizationDiff struct {
	Patches       map[string]interface{} `json:"patches"`
	HistoryEntries map[string]interface{} `json:"history_entries"`
	ContextChanges map[string]interface{} `json:"context_changes"`
}

// ─────────────────────────────────────────────
// Detailed Supporting Types
// ─────────────────────────────────────────────

type SerializedRect struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Top    float64 `json:"top"`
	Right  float64 `json:"right"`
	Bottom float64 `json:"bottom"`
	Left   float64 `json:"left"`
}

type SerializedPosition struct {
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Z    float64 `json:"z"`
	Type string  `json:"type"`
}

type SerializedDimensions struct {
	Width     float64  `json:"width"`
	Height    float64  `json:"height"`
	MinWidth  *float64 `json:"min_width,omitempty"`
	MaxWidth  *float64 `json:"max_width,omitempty"`
	MinHeight *float64 `json:"min_height,omitempty"`
	MaxHeight *float64 `json:"max_height,omitempty"`
}

type AccessibilityInfo struct {
	Role        string `json:"role"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Level       *int   `json:"level,omitempty"`
	Expanded    *bool  `json:"expanded,omitempty"`
	Selected    *bool  `json:"selected,omitempty"`
	Checked     *bool  `json:"checked,omitempty"`
}

type ColorPalette struct {
	Primary    string `json:"primary"`
	Secondary  string `json:"secondary"`
	Background string `json:"background"`
	Text       string `json:"text"`
	Border     string `json:"border"`
	Accent     string `json:"accent"`
}

type TypographyInfo struct {
	FontFamily    string  `json:"font_family"`
	FontSize      float64 `json:"font_size"`
	FontWeight    float64 `json:"font_weight"`
	LineHeight    float64 `json:"line_height"`
	LetterSpacing float64 `json:"letter_spacing"`
	TextAlign     string  `json:"text_align"`
}

type VisualEffects struct {
	BoxShadow    string  `json:"box_shadow"`
	BorderRadius float64 `json:"border_radius"`
	Opacity      float64 `json:"opacity"`
	Transform    string  `json:"transform"`
	Filter       string  `json:"filter"`
}

type InteractionState struct {
	Hover    bool `json:"hover"`
	Focus    bool `json:"focus"`
	Active   bool `json:"active"`
	Disabled bool `json:"disabled"`
	Selected bool `json:"selected"`
}

type CustomizableProperty struct {
	Name           string                 `json:"name"`
	Type           string                 `json:"type"`
	CurrentValue   interface{}            `json:"current_value"`
	PossibleValues []interface{}          `json:"possible_values,omitempty"`
	Constraints    *PropertyConstraints   `json:"constraints,omitempty"`
}

type PropertyConstraints struct {
	Min      *float64 `json:"min,omitempty"`
	Max      *float64 `json:"max,omitempty"`
	Step     *float64 `json:"step,omitempty"`
	Pattern  *string  `json:"pattern,omitempty"`
	Required *bool    `json:"required,omitempty"`
}

type CSSRuleSnapshot struct {
	Selector    string            `json:"selector"`
	Properties  map[string]string `json:"properties"`
	Specificity int               `json:"specificity"`
	Source      string            `json:"source"`
	MediaQuery  *string           `json:"media_query,omitempty"`
}

type ComponentStyle struct {
	Computed     map[string]string            `json:"computed"`
	Inline       map[string]string            `json:"inline"`
	Classes      []string                     `json:"classes"`
	PseudoStates map[string]map[string]string `json:"pseudo_states"`
}

type DesignTokens struct {
	Colors     map[string]string       `json:"colors"`
	Typography map[string]TypographyInfo `json:"typography"`
	Spacing    map[string]float64      `json:"spacing"`
	Effects    map[string]VisualEffects `json:"effects"`
}

type LayoutContainer struct {
	UID        string          `json:"uid"`
	Type       string          `json:"type"`
	Properties LayoutProperties `json:"properties"`
	Children   []LayoutChild   `json:"children"`
}

type LayoutProperties struct {
	Display              string  `json:"display"`
	FlexDirection        *string `json:"flex_direction,omitempty"`
	FlexWrap             *string `json:"flex_wrap,omitempty"`
	JustifyContent       *string `json:"justify_content,omitempty"`
	AlignItems           *string `json:"align_items,omitempty"`
	Gap                  *string `json:"gap,omitempty"`
	GridTemplateColumns  *string `json:"grid_template_columns,omitempty"`
	GridTemplateRows     *string `json:"grid_template_rows,omitempty"`
	Position             *string `json:"position,omitempty"`
}

type LayoutChild struct {
	UID         string           `json:"uid"`
	Order       int              `json:"order"`
	Constraints LayoutConstraints `json:"constraints"`
	FlexGrow    *float64         `json:"flex_grow,omitempty"`
	FlexShrink  *float64         `json:"flex_shrink,omitempty"`
	FlexBasis   *string          `json:"flex_basis,omitempty"`
	GridArea    *string          `json:"grid_area,omitempty"`
}

type LayoutConstraints struct {
	MinWidth    *float64 `json:"min_width,omitempty"`
	MaxWidth    *float64 `json:"max_width,omitempty"`
	MinHeight   *float64 `json:"min_height,omitempty"`
	MaxHeight   *float64 `json:"max_height,omitempty"`
	AspectRatio *float64 `json:"aspect_ratio,omitempty"`
}

type PositioningContext struct {
	UID             string  `json:"uid"`
	Type            string  `json:"type"`
	ZIndex          int     `json:"z_index"`
	ContainingBlock *string `json:"containing_block,omitempty"`
}

type ResponsiveBreakpoint struct {
	Name             string   `json:"name"`
	MinWidth         float64  `json:"min_width"`
	MaxWidth         *float64 `json:"max_width,omitempty"`
	ActiveComponents []string `json:"active_components"`
	HiddenComponents []string `json:"hidden_components"`
}

type StackingLayer struct {
	ZIndex     int      `json:"z_index"`
	Components []string `json:"components"`
	Context    string   `json:"context"`
}

type PatchInfo struct {
	ID        string                 `json:"id"`
	Op        string                 `json:"op"`
	Target    string                 `json:"target"`
	Payload   map[string]interface{} `json:"payload"`
	Timestamp int64                  `json:"timestamp"`
	Source    string                 `json:"source"`
}

type CustomizationEntry struct {
	ID          string                 `json:"id"`
	Timestamp   int64                  `json:"timestamp"`
	Type        string                 `json:"type"`
	Target      string                 `json:"target"`
	Changes     []CustomizationChange  `json:"changes"`
	UserIntent  string                 `json:"user_intent"`
	AIGenerated bool                   `json:"ai_generated"`
}

type CustomizationChange struct {
	Property   string  `json:"property"`
	OldValue   string  `json:"old_value"`
	NewValue   string  `json:"new_value"`
	Confidence float64 `json:"confidence"`
}

type CustomizationContext struct {
	ActiveSelection   *string                `json:"active_selection"`
	CustomizationMode string                 `json:"customization_mode"`
	AvailableActions  []CustomizationAction  `json:"available_actions"`
	Constraints       ContextConstraints     `json:"constraints"`
}

type CustomizationAction struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Target      string `json:"target"`
	Applicable  bool   `json:"applicable"`
}

type ContextConstraints struct {
	Readonly              bool     `json:"readonly"`
	MaxChanges            *int     `json:"max_changes,omitempty"`
	AllowedProperties     []string `json:"allowed_properties,omitempty"`
	ForbiddenProperties   []string `json:"forbidden_properties,omitempty"`
}

type BrowserInfo struct {
	UserAgent string `json:"user_agent"`
	Vendor    string `json:"vendor"`
	Version   string `json:"version"`
	Platform  string `json:"platform"`
}

type ViewportInfo struct {
	Width            float64 `json:"width"`
	Height           float64 `json:"height"`
	DevicePixelRatio float64 `json:"device_pixel_ratio"`
	Orientation      string  `json:"orientation"`
}

type PerformanceMetrics struct {
	CaptureTime       float64 `json:"capture_time"`
	SerializationTime float64 `json:"serialization_time"`
	ComponentCount    int     `json:"component_count"`
	TotalSize         int     `json:"total_size"`
}

type PageInfo struct {
	URL      string `json:"url"`
	Title    string `json:"title"`
	Lang     string `json:"lang"`
	Charset  string `json:"charset"`
	Viewport string `json:"viewport"`
}

type ComponentCounts struct {
	Total       int            `json:"total"`
	ByType      map[string]int `json:"by_type"`
	Interactive int            `json:"interactive"`
	Customized  int            `json:"customized"`
}

type CustomizationSummary struct {
	TotalChanges  int            `json:"total_changes"`
	ByType        map[string]int `json:"by_type"`
	AIGenerated   int            `json:"ai_generated"`
	UserGenerated int            `json:"user_generated"`
}

type CustomizationMetadata struct {
	Created      int64    `json:"created"`
	LastModified int64    `json:"last_modified"`
	Version      int      `json:"version"`
	Flags        []string `json:"flags"`
	Tags         []string `json:"tags"`
}

type ComponentModification struct {
	UID     string                 `json:"uid"`
	Changes map[string]interface{} `json:"changes"`
}

type ReorderOperation struct {
	ParentUID string   `json:"parent_uid"`
	NewOrder  []string `json:"new_order"`
}

type PositioningChange struct {
	UID         string             `json:"uid"`
	OldPosition SerializedPosition `json:"old_position"`
	NewPosition SerializedPosition `json:"new_position"`
}

type ResponsiveChange struct {
	Breakpoint string                    `json:"breakpoint"`
	Changes    map[string]interface{}    `json:"changes"`
}

// ─────────────────────────────────────────────
// Database JSON Types (for PostgreSQL JSONB)
// ─────────────────────────────────────────────

type ComponentStateArray []ComponentState

func (c ComponentStateArray) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *ComponentStateArray) Scan(value interface{}) error {
	if value == nil {
		*c = nil
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), c)
	}
	
	return json.Unmarshal(bytes, c)
}

func (s StyleSnapshot) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *StyleSnapshot) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), s)
	}
	
	return json.Unmarshal(bytes, s)
}

func (l LayoutStructure) Value() (driver.Value, error) {
	return json.Marshal(l)
}

func (l *LayoutStructure) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), l)
	}
	
	return json.Unmarshal(bytes, l)
}

func (c CustomizationLayer) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *CustomizationLayer) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), c)
	}
	
	return json.Unmarshal(bytes, c)
}

func (s SnapshotMetadata) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *SnapshotMetadata) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), s)
	}
	
	return json.Unmarshal(bytes, s)
}

func (c ComponentDiff) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *ComponentDiff) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), c)
	}
	
	return json.Unmarshal(bytes, c)
}

func (s StyleDiff) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *StyleDiff) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), s)
	}
	
	return json.Unmarshal(bytes, s)
}

func (l LayoutDiff) Value() (driver.Value, error) {
	return json.Marshal(l)
}

func (l *LayoutDiff) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), l)
	}
	
	return json.Unmarshal(bytes, l)
}

func (c CustomizationDiff) Value() (driver.Value, error) {
	return json.Marshal(c)
}

func (c *CustomizationDiff) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), c)
	}
	
	return json.Unmarshal(bytes, c)
}

func (e EmbeddingMetadata) Value() (driver.Value, error) {
	return json.Marshal(e)
}

func (e *EmbeddingMetadata) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal([]byte(value.(string)), e)
	}
	
	return json.Unmarshal(bytes, e)
}

// Vector type for PostgreSQL arrays
type Float32Array []float32

func (v *Float32Array) Scan(value interface{}) error {
	if value == nil {
		*v = nil
		return nil
	}
	
	// PostgreSQL array format: "{1.0,2.0,3.0}"
	str := string(value.([]byte))
	str = strings.Trim(str, "{}")
	
	if str == "" {
		*v = Float32Array{}
		return nil
	}
	
	parts := strings.Split(str, ",")
	result := make(Float32Array, len(parts))
	
	for i, part := range parts {
		var f float64
		if err := json.Unmarshal([]byte(part), &f); err != nil {
			return err
		}
		result[i] = float32(f)
	}
	
	*v = result
	return nil
}

func (v Float32Array) Value() (driver.Value, error) {
	if len(v) == 0 {
		return "{}", nil
	}
	
	strs := make([]string, len(v))
	for i, val := range v {
		strs[i] = fmt.Sprintf("%.6f", val)
	}
	
	return "{" + strings.Join(strs, ",") + "}", nil
}