extends "res://scripts/source_window.gd"

const UI_FONT := "res://assets/fonts/DotGothic16-Regular.ttf"
const CHAT_ROOM := "チャット・ルーム"
const PARTY_ROOM := "パーティー"

var topic := ""
var room := CHAT_ROOM
var privacy := "公開"
var room_menu_open := false
var feedback := ""

var topic_editor: LineEdit
var topic_value_label: Label
var room_value_background: ColorRect
var room_value_label: Label
var room_menu: Control
var web_topic_callback: JavaScriptObject
var pixel_font: FontFile

func _ready() -> void:
	super._ready()
	pixel_font = load(UI_FONT).duplicate()
	pixel_font.antialiasing = TextServer.FONT_ANTIALIASING_NONE
	pixel_font.hinting = TextServer.HINTING_NONE
	pixel_font.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	_build_topic_editor()
	_build_room_value()
	_build_room_menu()
	_rewire_chat_hits()
	_update_chat_visuals()
	_setup_web_topic_input()

func _setup_web_topic_input() -> void:
	if not OS.has_feature("web"): return
	web_topic_callback = JavaScriptBridge.create_callback(_on_web_topic_input)
	var browser_window := JavaScriptBridge.get_interface("window")
	browser_window.godotChatTopicCallback = web_topic_callback
	JavaScriptBridge.eval("""
		(() => {
			let input = document.getElementById('godot-chat-topic');
			if (!input) {
				input = document.createElement('input');
				input.id = 'godot-chat-topic';
				input.type = 'text';
				input.lang = 'ja';
				input.setAttribute('aria-label', 'トピック');
				input.autocomplete = 'off';
				input.style.cssText = 'position:fixed;left:-1000px;top:-1000px;width:1px;height:1px;opacity:0;pointer-events:none';
				input.addEventListener('input', event => window.godotChatTopicCallback(event.target.value));
				document.body.appendChild(input);
			}
		})();
	""")

func _on_web_topic_input(args: Array) -> void:
	if args.is_empty(): return
	var value := str(args[0]).left(24)
	topic_editor.text = value
	# Programmatic LineEdit.text assignment does not emit text_changed.
	_on_topic_changed(value)

func _focus_web_topic_input() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("document.getElementById('godot-chat-topic')?.focus()")

func _blur_web_topic_input() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("document.getElementById('godot-chat-topic')?.blur()")

func _build_topic_editor() -> void:
	topic_editor = LineEdit.new()
	topic_editor.name = "TopicEditor"
	# Godot's LineEdit has a theme minimum taller than this 19px source field.
	# Keep the real focus/IME control off-canvas and render its value through a
	# source-sized label so it can never intercept the People/Room row below.
	topic_editor.position = Vector2(-1000, -1000)
	topic_editor.size = Vector2(1, 1)
	topic_editor.flat = true
	topic_editor.max_length = 24
	topic_editor.add_theme_font_override("font", pixel_font)
	topic_editor.add_theme_font_size_override("font_size", 11)
	topic_editor.add_theme_color_override("font_color", Color("#17395f"))
	topic_editor.add_theme_color_override("caret_color", Color("#17395f"))
	topic_editor.add_theme_stylebox_override("normal", StyleBoxEmpty.new())
	topic_editor.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	topic_editor.text_changed.connect(_on_topic_changed)
	add_child(topic_editor)
	topic_value_label = Label.new()
	topic_value_label.name = "TopicValue"
	topic_value_label.position = Vector2(48, 26)
	topic_value_label.size = Vector2(224, 18)
	topic_value_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	topic_value_label.add_theme_font_override("font", pixel_font)
	topic_value_label.add_theme_font_size_override("font_size", 10)
	topic_value_label.add_theme_color_override("font_color", Color("#17395f"))
	topic_value_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(topic_value_label)

func _build_room_value() -> void:
	room_value_background = ColorRect.new()
	room_value_background.name = "RoomValueBackground"
	room_value_background.position = Vector2(184, 48)
	room_value_background.size = Vector2(72, 14)
	room_value_background.color = Color("#fbfaf7")
	room_value_background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(room_value_background)
	room_value_label = Label.new()
	room_value_label.name = "RoomValue"
	room_value_label.position = Vector2(185, 46)
	room_value_label.size = Vector2(71, 17)
	room_value_label.add_theme_font_override("font", pixel_font)
	room_value_label.add_theme_font_size_override("font_size", 10)
	room_value_label.add_theme_color_override("font_color", Color("#17395f"))
	room_value_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(room_value_label)

func _build_room_menu() -> void:
	room_menu = Control.new()
	room_menu.name = "RoomMenu"
	room_menu.position = Vector2(181, 64)
	room_menu.size = Vector2(95, 36)
	room_menu.z_index = 50
	room_menu.visible = false
	add_child(room_menu)
	var border := ColorRect.new()
	border.color = Color("#777f91")
	border.size = room_menu.size
	border.mouse_filter = Control.MOUSE_FILTER_IGNORE
	room_menu.add_child(border)
	var fill := ColorRect.new()
	fill.color = Color("#f8f7f4")
	fill.position = Vector2.ONE
	fill.size = room_menu.size - Vector2(2, 2)
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	room_menu.add_child(fill)
	for index in 2:
		var choice := Control.new()
		choice.name = "RoomChoice%d" % index
		choice.position = Vector2(1, 1 + index * 17)
		choice.size = Vector2(93, 17)
		choice.mouse_filter = Control.MOUSE_FILTER_STOP
		choice.focus_mode = Control.FOCUS_ALL
		choice.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		room_menu.add_child(choice)
		var highlight := ColorRect.new()
		highlight.name = "Highlight"
		highlight.size = choice.size
		highlight.color = Color(0.48, 0.65, 0.86, 0.0)
		highlight.mouse_filter = Control.MOUSE_FILTER_IGNORE
		choice.add_child(highlight)
		var label := Label.new()
		label.name = "Label"
		label.text = [CHAT_ROOM, PARTY_ROOM][index]
		label.position = Vector2(3, 0)
		label.size = Vector2(89, 17)
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_font_override("font", pixel_font)
		label.add_theme_font_size_override("font_size", 9)
		label.add_theme_color_override("font_color", Color("#17395f"))
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		choice.add_child(label)
		choice.gui_input.connect(_on_room_choice_input.bind(label.text, highlight))

func _on_room_choice_input(event: InputEvent, value: String, highlight: ColorRect) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		highlight.color.a = 0.28 if event.pressed else 0.0
		if not event.pressed: _choose_room(value)
	elif event is InputEventKey and event.pressed and event.keycode in [KEY_ENTER, KEY_SPACE]:
		_choose_room(value)

func _rewire_chat_hits() -> void:
	for node: Control in hit_nodes.values():
		for connection in node.gui_input.get_connections():
			node.gui_input.disconnect(connection.callable)
		node.gui_input.connect(_on_chat_control_input.bind(node))
		node.move_to_front()
	topic_editor.move_to_front()

func _on_chat_control_input(event: InputEvent, node: Control) -> void:
	var control: Dictionary = node.get_meta("control")
	var control_id := str(control.id)
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_set_press_visual(control_id, event.pressed)
		if not event.pressed:
			_activate_control(control)
	elif event is InputEventKey and event.pressed and event.keycode in [KEY_ENTER, KEY_SPACE]:
		_activate_control(control)

func _toggle_room_menu() -> void:
	_blur_web_topic_input()
	last_action = "ルーム"
	room_menu_open = not room_menu_open
	feedback = ""
	_update_chat_visuals()
	state_changed.emit()

func _submit() -> void:
	_blur_web_topic_input()
	last_action = "OK"
	room_menu_open = false
	feedback = "%s %s「%s」を作成しました" % [privacy, room, topic]
	_update_chat_visuals()
	state_changed.emit()

func _on_topic_changed(value: String) -> void:
	topic = value
	topic_value_label.text = topic
	if OS.has_feature("web"):
		var encoded := JSON.stringify(topic)
		JavaScriptBridge.eval("{const e=document.getElementById('godot-chat-topic');if(e&&e.value!==%s)e.value=%s}" % [encoded, encoded])
	last_action = "トピック:%s" % topic
	feedback = ""
	state_changed.emit()

func _activate_control(control: Dictionary) -> void:
	var control_id := str(control.id)
	last_action = control_id
	match control_id:
		"トピック":
			# Web has one IME authority. Giving both Godot's off-canvas LineEdit
			# and the hidden DOM input focus lets the engine reclaim composition
			# events and clear Japanese text after a rebuild.
			if OS.has_feature("web"):
				_focus_web_topic_input()
			else:
				topic_editor.grab_focus()
		"ルーム":
			_toggle_room_menu()
		"公開":
			_set_privacy("公開")
		"非公開":
			_set_privacy("非公開")
		"OK":
			_submit()
		"cancel":
			_reset_form()
		_:
			super._activate_control(control)
	state_changed.emit()

func _choose_room(value: String) -> void:
	_blur_web_topic_input()
	room = value
	room_menu_open = false
	feedback = ""
	last_action = "ルーム:%s" % room
	_update_chat_visuals()
	state_changed.emit()

func _set_privacy(value: String) -> void:
	_blur_web_topic_input()
	last_action = value
	privacy = value
	room_menu_open = false
	feedback = ""
	_update_chat_visuals()
	state_changed.emit()

func _reset_form() -> void:
	_blur_web_topic_input()
	last_action = "cancel"
	topic = ""
	topic_editor.text = ""
	topic_value_label.text = ""
	room = CHAT_ROOM
	privacy = "公開"
	room_menu_open = false
	feedback = "キャンセルしました"
	_update_chat_visuals()
	state_changed.emit()

func _update_chat_visuals() -> void:
	room_menu.visible = room_menu_open
	room_value_background.visible = room != CHAT_ROOM
	room_value_label.visible = room != CHAT_ROOM
	room_value_label.text = room
	var public_visual: TextureRect = component_nodes["chat-privacy-public"]
	var private_visual: TextureRect = component_nodes["chat-privacy-private"]
	public_visual.texture = load(_asset_path("/assets/japanese-rpg-v001/chat/components/%s.png" % ("privacy-on" if privacy == "公開" else "privacy-off")))
	private_visual.texture = load(_asset_path("/assets/japanese-rpg-v001/chat/components/%s.png" % ("privacy-on" if privacy == "非公開" else "privacy-off")))
	if room_menu_open:
		room_menu.move_to_front()
	else:
		topic_editor.move_to_front()

func qa_state() -> Dictionary:
	var state := super.qa_state()
	state.chat_form = {
		"topic": topic,
		"room": room,
		"privacy": privacy,
		"room_menu_open": room_menu_open,
		"feedback": feedback,
	}
	return state
