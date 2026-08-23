extends Control

const VIEWPORT_SIZE := Vector2(849, 564)
const SOURCE_PINK := Color("#ff00fe")
const MANIFEST_PATH := "res://data/runtime-component-manifest.json"

var desktop_windows: Array = []
var windows_by_id := {}
var windows_layer: Control
var options_window: Control

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_build_background()
	_build_windows()
	_publish_desktop_qa()

func _build_background() -> void:
	var background := ColorRect.new()
	background.name = "DesktopBackground"
	background.color = SOURCE_PINK
	background.position = Vector2.ZERO
	background.size = VIEWPORT_SIZE
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)

func _build_windows() -> void:
	windows_layer = Control.new()
	windows_layer.name = "Windows"
	windows_layer.position = Vector2.ZERO
	windows_layer.size = VIEWPORT_SIZE
	windows_layer.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(windows_layer)

	var file := FileAccess.open(MANIFEST_PATH, FileAccess.READ)
	if file == null:
		push_error("Unable to open desktop component manifest")
		return
	var manifest: Dictionary = JSON.parse_string(file.get_as_text())
	for definition in manifest.windows:
		if str(definition.id) == "options": continue
		var window := preload("res://scripts/source_window.gd").new()
		window.configure(definition)
		window.activated.connect(_activate_window)
		window.state_changed.connect(_publish_desktop_qa)
		window.navigation_requested.connect(_navigate_to_window)
		windows_layer.add_child(window)
		desktop_windows.append(window)
		windows_by_id[window.window_id] = window

	options_window = preload("res://scripts/options_window.gd").new()
	options_window.name = "options"
	options_window.position = Vector2(345, 182)
	windows_layer.add_child(options_window)
	desktop_windows.append(options_window)
	windows_by_id.options = options_window

func _activate_window(window_id: String) -> void:
	if not windows_by_id.has(window_id): return
	var window: Control = windows_by_id[window_id]
	window.move_to_front()
	_publish_desktop_qa()

func _navigate_to_window(window_id: String) -> void:
	if not windows_by_id.has(window_id): return
	var window: Control = windows_by_id[window_id]
	window.visible = true
	window.move_to_front()
	_publish_desktop_qa()

func desktop_qa_state() -> Dictionary:
	var window_states := {}
	var component_count := 0
	var control_count := 0
	var mapped_controls := 0
	for window in desktop_windows:
		if window == options_window:
			var options_state: Dictionary = options_window._qa_state()
			window_states.options = options_state
			component_count += int(options_state.visual_authorities)
			control_count += int(options_state.controls)
			mapped_controls += int(options_state.mapped_controls)
		else:
			var source_state: Dictionary = window.qa_state()
			window_states[window.window_id] = source_state
			component_count += int(source_state.components)
			control_count += int(source_state.controls)
			mapped_controls += int(source_state.mapped_controls)
	return {
		"ready": desktop_windows.size() == 15,
		"background": "#ff00fe",
		"window_count": desktop_windows.size(),
		"window_ids": windows_by_id.keys(),
		"component_count": component_count,
		"control_count": control_count,
		"desktop_mapped_controls": mapped_controls,
		"movable_windows": desktop_windows.size(),
		"windows": window_states,
	}

func _publish_desktop_qa() -> void:
	if desktop_windows.is_empty(): return
	var state := desktop_qa_state()
	var options_state: Dictionary = state.windows.options
	for key in options_state.keys():
		state[key] = options_state[key]
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.godotQaState = " + JSON.stringify(state) + ";")
