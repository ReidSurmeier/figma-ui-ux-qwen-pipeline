extends "res://scripts/source_window.gd"

var value := 0
var feedback := ""

func _ready() -> void:
	super._ready()
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections(): node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_bottom_bar_input.bind(node))
	_set_value(0, "")

func _on_bottom_bar_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			activated.emit(window_id)
			if id == "クイックスロット位置":
				dragging_range = id
				_set_value(roundi(clampf(event.position.x / maxf(node.size.x - 1.0, 1.0), 0.0, 1.0) * 100.0), "drag")
			else: _set_press_visual(id, true)
		else:
			if id == "クイックスロット位置": dragging_range = ""
			else:
				_set_press_visual(id, false)
				if id == "前のスロット": _set_value(value - 10, "previous")
				elif id == "次のスロット": _set_value(value + 10, "next")
	elif event is InputEventMouseMotion and dragging_range == id and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		_set_value(roundi(clampf(event.position.x / maxf(node.size.x - 1.0, 1.0), 0.0, 1.0) * 100.0), "drag")
	elif event is InputEventKey and event.pressed:
		if event.keycode in [KEY_LEFT, KEY_DOWN]: _set_value(value - 1, "keyboard")
		elif event.keycode in [KEY_RIGHT, KEY_UP]: _set_value(value + 1, "keyboard")
		elif event.keycode == KEY_HOME: _set_value(0, "keyboard")
		elif event.keycode == KEY_END: _set_value(100, "keyboard")

func _set_value(next_value: int, next_feedback: String) -> void:
	value = clampi(next_value, 0, 100)
	feedback = next_feedback
	range_values["クイックスロット位置"] = value
	component_nodes["bottom-bar-thumb"].position.x = 98 + roundi(474.0 * value / 100.0)
	last_action = "クイックスロット位置:%d" % value
	state_changed.emit()

func qa_state() -> Dictionary:
	var result := super.qa_state()
	result.bottom_bar_state = {"value": value, "thumb_x": roundi(component_nodes["bottom-bar-thumb"].position.x), "feedback": feedback}
	return result
