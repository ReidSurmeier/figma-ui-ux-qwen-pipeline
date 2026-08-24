extends "res://scripts/source_window.gd"

const UI_FONT := "res://assets/fonts/DotGothic16-Regular.ttf"
const INCREMENT_ROWS := [0, 1, 2, 4, 5]

var values: Array[int] = [1, 1, 1, 0, 1, 1]
var value_overlays := {}
var pixel_font: FontFile
var feedback := ""

func _ready() -> void:
	super._ready()
	pixel_font = load(UI_FONT).duplicate()
	pixel_font.antialiasing = TextServer.FONT_ANTIALIASING_NONE
	pixel_font.hinting = TextServer.HINTING_NONE
	pixel_font.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	_build_value_overlays()
	_rewire_status_hits()

func _build_value_overlays() -> void:
	for row in INCREMENT_ROWS:
		var overlay := Control.new()
		overlay.name = "StatusValue%d" % row
		overlay.position = Vector2(53, 18 + row * 18 + 3)
		overlay.size = Vector2(11, 14)
		overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
		overlay.visible = false
		add_child(overlay)
		var fill := ColorRect.new()
		fill.color = Color.WHITE
		fill.size = overlay.size
		fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
		overlay.add_child(fill)
		var label := Label.new()
		label.name = "Value"
		label.position = Vector2(1, 0)
		label.size = Vector2(10, 14)
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_font_override("font", pixel_font)
		label.add_theme_font_size_override("font_size", 10)
		label.add_theme_color_override("font_color", Color.BLACK)
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		overlay.add_child(label)
		value_overlays[row] = overlay

func _rewire_status_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_status_control_input.bind(node))
		node.move_to_front()

func _on_status_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			activated.emit(window_id)
			_set_press_visual(control_id, true)
		else:
			_set_press_visual(control_id, false)
			_activate_status_control(control)
	elif event is InputEventKey and event.pressed and event.keycode in [KEY_ENTER, KEY_SPACE]:
		_activate_status_control(control)

func _activate_status_control(control: Dictionary) -> void:
	var control_id := str(control.id)
	last_action = control_id
	var visual_id := str(control.get("visualComponent", ""))
	if visual_id.begins_with("status-increment-"):
		var row := int(visual_id.get_slice("-", 2))
		values[row] += 1
		var overlay: Control = value_overlays[row]
		overlay.get_node("Value").text = str(values[row])
		overlay.visible = true
		feedback = "%s+1" % control_id.trim_suffix("を上げる")
		state_changed.emit()
		return
	super._activate_control(control)

func _set_expanded_visuals_visible(value: bool) -> void:
	super._set_expanded_visuals_visible(value)
	for row in value_overlays.keys():
		value_overlays[row].visible = value and values[row] > 1

func qa_state() -> Dictionary:
	var state := super.qa_state()
	state.status_state = {
		"values": values,
		"feedback": feedback,
	}
	return state
