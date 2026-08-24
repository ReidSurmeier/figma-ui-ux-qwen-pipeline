extends "res://scripts/source_window.gd"

const GRID_ORIGIN := Vector2(36, 18)
const GRID_SIZE := Vector2(227, 103)
const CATEGORY_COUNTS := {"item": 21, "equip": 14, "etc": 7}
const CATEGORY_ORDER := ["item", "equip", "etc"]

var category := "item"
var selected_cells := {"item": -1, "equip": -1, "etc": -1}
var scroll_value := 0
var grid_clip: Control
var cell_visual_idle := {}
var cell_hit_idle := {}

func _ready() -> void:
	super._ready()
	_build_grid_clip()
	_rewire_inventory_hits()
	_update_category("item")
	_update_scroll(0)

func _build_grid_clip() -> void:
	grid_clip = Control.new()
	grid_clip.name = "InventoryGridClip"
	grid_clip.position = GRID_ORIGIN
	grid_clip.size = GRID_SIZE
	grid_clip.clip_contents = true
	grid_clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(grid_clip)
	for row in 3:
		for column in 7:
			var component_id := "inventory-cell-%d-%d" % [row, column]
			var visual: TextureRect = component_nodes[component_id]
			var idle := visual.position - GRID_ORIGIN
			remove_child(visual)
			grid_clip.add_child(visual)
			visual.position = idle
			cell_visual_idle[component_id] = idle
	for control_id in hit_nodes.keys():
		var hit: Control = hit_nodes[control_id]
		var control: Dictionary = hit.get_meta("control")
		var visual_id := str(control.get("visualComponent", ""))
		if not visual_id.begins_with("inventory-cell-"): continue
		var idle := hit.position - GRID_ORIGIN
		remove_child(hit)
		grid_clip.add_child(hit)
		hit.position = idle
		cell_hit_idle[control_id] = idle
	grid_clip.move_to_front()
	for id in [
		"inventory-scroll-up", "inventory-scroll-track", "inventory-scroll-thumb",
		"inventory-scroll-down", "inventory-resize-grip", "inventory-tab-item",
		"inventory-tab-equip", "inventory-tab-etc", "inventory-title-icon",
		"inventory-title-text", "inventory-minimize", "inventory-close",
	]:
		component_nodes[id].move_to_front()
	for node: Control in hit_nodes.values(): node.move_to_front()

func _rewire_inventory_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_inventory_control_input.bind(node))

func _on_inventory_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			activated.emit(window_id)
			if control_id == "所持品スクロール":
				dragging_range = control_id
				_set_scroll_from_pointer(event.position.y, node.size.y)
			else:
				_set_press_visual(control_id, true)
		else:
			if control_id == "所持品スクロール":
				dragging_range = ""
			else:
				_set_press_visual(control_id, false)
				_activate_inventory_control(control)
	elif event is InputEventMouseMotion and dragging_range == control_id and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
		_set_scroll_from_pointer(event.position.y, node.size.y)
	elif event is InputEventKey and event.pressed:
		if control_id == "所持品スクロール":
			if event.keycode in [KEY_LEFT, KEY_DOWN]: _update_scroll(clampi(scroll_value - 1, 0, 100))
			elif event.keycode in [KEY_RIGHT, KEY_UP]: _update_scroll(clampi(scroll_value + 1, 0, 100))
			elif event.keycode == KEY_HOME: _update_scroll(0)
			elif event.keycode == KEY_END: _update_scroll(100)
		elif control_id in CATEGORY_ORDER and event.keycode in [KEY_UP, KEY_DOWN]:
			var direction := -1 if event.keycode == KEY_UP else 1
			_update_category(CATEGORY_ORDER[posmod(CATEGORY_ORDER.find(control_id) + direction, CATEGORY_ORDER.size())])
		elif event.keycode in [KEY_ENTER, KEY_SPACE]:
			_activate_inventory_control(control)

func _activate_inventory_control(control: Dictionary) -> void:
	var control_id := str(control.id)
	last_action = control_id
	if control.has("minimizeEndpoint") or control.has("closeWindow"):
		super._activate_control(control)
		return
	if control_id in CATEGORY_ORDER:
		_update_category(control_id)
		return
	var index := _cell_index(control)
	if index < 0 or index >= int(CATEGORY_COUNTS[category]): return
	selected_cells[category] = index
	_update_cell_visuals()
	state_changed.emit()

func _cell_index(control: Dictionary) -> int:
	var visual_id := str(control.get("visualComponent", ""))
	if not visual_id.begins_with("inventory-cell-"): return -1
	return int(visual_id.get_slice("-", 2)) * 7 + int(visual_id.get_slice("-", 3))

func _update_category(value: String) -> void:
	category = value
	_update_scroll(0)
	for tab in CATEGORY_ORDER:
		var visual: TextureRect = component_nodes["inventory-tab-%s" % tab]
		# Preserve the exact source-authored item state at boot. Other settled
		# category states are explicit authored feedback, never browser-native UI.
		if category == "item": visual.modulate = Color.WHITE
		elif tab == category: visual.modulate = Color(0.72, 0.88, 1.0, 1.0)
		else: visual.modulate = Color(0.76, 0.76, 0.76, 1.0)
	_update_cell_visuals()
	state_changed.emit()

func _update_cell_visuals() -> void:
	var count := int(CATEGORY_COUNTS[category])
	for row in 3:
		for column in 7:
			var index := row * 7 + column
			var component_id := "inventory-cell-%d-%d" % [row, column]
			var visible_for_category := index < count
			var visual: TextureRect = component_nodes[component_id]
			visual.visible = visible_for_category
			visual.modulate = Color(0.76, 0.9, 1.0, 1.0) if index == int(selected_cells[category]) else Color.WHITE
	for control_id in cell_hit_idle.keys():
		var hit: Control = hit_nodes[control_id]
		hit.visible = _cell_index(hit.get_meta("control")) < count

func _set_scroll_from_pointer(pointer_y: float, extent: float) -> void:
	_update_scroll(roundi(clampf(pointer_y / maxf(extent - 1.0, 1.0), 0.0, 1.0) * 100.0))

func _update_scroll(value: int) -> void:
	scroll_value = clampi(value, 0, 100)
	range_values["所持品スクロール"] = scroll_value
	var offset := roundi(12.0 * scroll_value / 100.0)
	for component_id in cell_visual_idle.keys():
		component_nodes[component_id].position = cell_visual_idle[component_id] - Vector2(0, offset)
	for control_id in cell_hit_idle.keys():
		hit_nodes[control_id].position = cell_hit_idle[control_id] - Vector2(0, offset)
	component_nodes["inventory-scroll-thumb"].position.y = 31 + roundi(19.0 * scroll_value / 100.0)
	last_action = "所持品スクロール:%d" % scroll_value
	state_changed.emit()

func qa_state() -> Dictionary:
	var result := super.qa_state()
	var visible_selection: Array[int] = []
	if int(selected_cells[category]) >= 0: visible_selection.append(int(selected_cells[category]))
	result.inventory_state = {
		"category": category,
		"visible_cells": int(CATEGORY_COUNTS[category]),
		"selected_cells": selected_cells.duplicate(),
		"selected_visible_indices": visible_selection,
		"scroll": scroll_value,
	}
	return result
