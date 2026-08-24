extends "res://scripts/source_window.gd"

var selected := -1
var feedback := "slot ready"

func _ready() -> void:
	super._ready()
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections(): node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_quickbar_input.bind(node))
	_update_slots()

func _on_quickbar_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_set_press_visual(str(control.id), event.pressed)
		if not event.pressed:
			activated.emit(window_id)
			_toggle_slot(_slot_index(control))
	elif event is InputEventKey and event.pressed:
		var index := _slot_index(control)
		if event.keycode in [KEY_LEFT, KEY_UP]: _select_slot(posmod(index - 1, 3))
		elif event.keycode in [KEY_RIGHT, KEY_DOWN]: _select_slot(posmod(index + 1, 3))
		elif event.keycode in [KEY_ENTER, KEY_SPACE]: _toggle_slot(index)

func _slot_index(control: Dictionary) -> int:
	return int(str(control.visualComponent).get_slice("-", 2))

func _toggle_slot(index: int) -> void:
	if selected == index:
		selected = -1
		feedback = "slot ready"
	else: _select_slot(index); return
	_update_slots(); state_changed.emit()

func _select_slot(index: int) -> void:
	selected = clampi(index, 0, 2)
	feedback = "slot %d" % (selected + 1)
	last_action = feedback
	_update_slots(); state_changed.emit()

func _update_slots() -> void:
	for index in 3:
		component_nodes["quickbar-slot-%d" % index].modulate = Color(0.72, 0.88, 1.0, 1.0) if selected == index else Color.WHITE

func qa_state() -> Dictionary:
	var result := super.qa_state()
	var selected_indices: Array[int] = []
	if selected >= 0: selected_indices.append(selected)
	result.quickbar_state = {"selected": selected, "selected_indices": selected_indices, "feedback": feedback}
	return result
