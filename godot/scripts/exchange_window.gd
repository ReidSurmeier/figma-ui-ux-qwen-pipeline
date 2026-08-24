extends "res://scripts/source_window.gd"

var selected := -1
var confirmed := false
var feedback := ""

func _ready() -> void:
	super._ready()
	_rewire_exchange_hits()
	_update_exchange_visuals()

func _rewire_exchange_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_exchange_control_input.bind(node))

func _on_exchange_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_set_press_visual(control_id, event.pressed)
		if not event.pressed:
			activated.emit(window_id)
			_activate_exchange_control(control)
	elif event is InputEventKey and event.pressed:
		var index := _item_index(control)
		if index >= 0 and event.keycode in [KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN]:
			var delta := 0
			if event.keycode == KEY_LEFT: delta = -1
			elif event.keycode == KEY_RIGHT: delta = 1
			elif event.keycode == KEY_UP: delta = -8
			elif event.keycode == KEY_DOWN: delta = 8
			_select_item(posmod(index + delta, 16))
		elif event.keycode in [KEY_ENTER, KEY_SPACE]:
			_activate_exchange_control(control)

func _activate_exchange_control(control: Dictionary) -> void:
	var control_id := str(control.id)
	last_action = control_id
	var index := _item_index(control)
	if index >= 0:
		_select_item(index)
		return
	match control_id:
		"OK":
			if selected < 0: return
			confirmed = true
			feedback = "交換内容を確認しました"
		"trade":
			if not confirmed: return
			_reset_transaction("交換しました")
		"cancel":
			_reset_transaction("交換をキャンセルしました")
	_update_exchange_visuals()
	state_changed.emit()

func _item_index(control: Dictionary) -> int:
	var visual_id := str(control.get("visualComponent", ""))
	if not visual_id.begins_with("exchange-item-"): return -1
	return int(visual_id.get_slice("-", 2)) * 8 + int(visual_id.get_slice("-", 3))

func _select_item(index: int) -> void:
	selected = clampi(index, 0, 15)
	confirmed = false
	feedback = "交換アイテム %d を選択" % (selected + 1)
	last_action = feedback
	_update_exchange_visuals()
	state_changed.emit()

func _reset_transaction(message: String) -> void:
	selected = -1
	confirmed = false
	feedback = message

func _update_exchange_visuals() -> void:
	for row in 2:
		for column in 8:
			var index := row * 8 + column
			var visual: TextureRect = component_nodes["exchange-item-%d-%d" % [row, column]]
			visual.modulate = Color(0.73, 0.89, 1.0, 1.0) if index == selected else Color.WHITE
	component_nodes["exchange-trade"].modulate = Color(0.7, 0.88, 1.0, 1.0) if confirmed else Color.WHITE

func qa_state() -> Dictionary:
	var result := super.qa_state()
	var selected_indices: Array[int] = []
	if selected >= 0: selected_indices.append(selected)
	result.exchange_state = {
		"selected": selected,
		"selected_indices": selected_indices,
		"confirmed": confirmed,
		"trade_enabled": confirmed,
		"feedback": feedback,
	}
	return result
