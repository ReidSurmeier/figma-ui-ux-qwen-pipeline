extends Control

const VIEWPORT_SIZE := Vector2(849, 564)
const WINDOW_POSITION := Vector2(345, 182)

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var background := ColorRect.new()
	background.name = "DesktopBackground"
	background.color = Color.WHITE
	background.position = Vector2.ZERO
	background.size = VIEWPORT_SIZE
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var background_shader := Shader.new()
	background_shader.code = """
		shader_type canvas_item;
		void fragment() {
			vec3 root = vec3(17.0, 24.0, 39.0) / 255.0;
			float row = floor(UV.y * 564.0);
			float stripe = step(15.0, mod(row, 16.0));
			vec3 under = mix(root, vec3(1.0), stripe * 0.025);
			float progress = clamp((UV.x * 849.0 + UV.y * 564.0) / 1413.0, 0.0, 1.0);
			vec4 gradient = mix(
				vec4(vec3(42.0, 59.0, 82.0) / 255.0, 0.96),
				vec4(vec3(17.0, 26.0, 40.0) / 255.0, 0.98),
				progress
			);
			COLOR = vec4(mix(under, gradient.rgb, gradient.a), 1.0);
		}
	"""
	var background_material := ShaderMaterial.new()
	background_material.shader = background_shader
	background.material = background_material
	add_child(background)

	var options := preload("res://scripts/options_window.gd").new()
	options.name = "OptionsWindow"
	options.position = WINDOW_POSITION
	add_child(options)
