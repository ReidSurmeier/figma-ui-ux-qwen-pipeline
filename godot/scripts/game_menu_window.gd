extends "res://scripts/source_window.gd"

const LABELS := ["Return to last save point", "Character Select", "Exit to Windows", "Return to game"]

var selected := -1
var feedback := "menu ready"

func _ready() -> void:
	super._ready()
	_rewire_game_menu_hits()
	_update_game_menu_visuals()

func _rewire_game_menu_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_game_menu_control_input.bind(node))

func _on_game_menu_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_set_press_visual(control_id, event.pressed)
		if not event.pressed:
			activated.emit(window_id)
			_toggle_action(_action_index(control))
	elif event is InputEventKey and event.pressed:
		var index := _action_index(control)
		if event.keycode in [KEY_UP, KEY_DOWN]:
			_toggle_action(posmod(index + (-1 if event.keycode == KEY_UP else 1), LABELS.size()))
		elif event.keycode in [KEY_ENTER, KEY_SPACE]:
			_toggle_action(index)

func _action_index(control: Dictionary) -> int:
	var visual_id := str(control.get("visualComponent", ""))
	if not visual_id.begins_with("game-menu-action-"): return -1
	return int(visual_id.get_slice("-", 3))

func _toggle_action(index: int) -> void:
	if index < 0: return
	selected = -1 if selected == index else index
	feedback = "menu ready" if selected < 0 else LABELS[selected]
	last_action = feedback
	_update_game_menu_visuals()
	state_changed.emit()

func _update_game_menu_visuals() -> void:
	for row in LABELS.size():
		component_nodes["game-menu-action-%d" % row].modulate = Color(0.72, 0.88, 1.0, 1.0) if selected == row else Color.WHITE

func qa_state() -> Dictionary:
	var result := super.qa_state()
	var selected_indices: Array[int] = []
	if selected >= 0: selected_indices.append(selected)
	result.game_menu_state = {
		"selected": selected,
		"selected_indices": selected_indices,
		"feedback": feedback,
	}
	return result
