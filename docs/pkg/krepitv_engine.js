/* @ts-self-types="./krepitv_engine.d.ts" */

/**
 * @param {string} source
 * @param {string} tv_menu_visible
 * @param {string} source_powered
 * @param {string} input_matches
 * @param {string} cable_connected
 * @param {string} receiver_menu_visible
 * @returns {string}
 */
export function calculate_tv_no_signal_json(source, tv_menu_visible, source_powered, input_matches, cable_connected, receiver_menu_visible) {
    let deferred7_0;
    let deferred7_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(tv_menu_visible, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(source_powered, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(input_matches, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(cable_connected, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passStringToWasm0(receiver_menu_visible, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len5 = WASM_VECTOR_LEN;
        wasm.calculate_tv_no_signal_json(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred7_0 = r0;
        deferred7_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred7_0, deferred7_1, 1);
    }
}

/**
 * @param {number} diagonal_inches
 * @param {number} eye_height_cm
 * @param {number} viewing_distance_cm
 * @param {number} viewing_angle_deg
 * @param {number} furniture_height_cm
 * @param {number} requested_clearance_cm
 * @returns {string}
 */
export function height_plan_json(diagonal_inches, eye_height_cm, viewing_distance_cm, viewing_angle_deg, furniture_height_cm, requested_clearance_cm) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.height_plan_json(retptr, diagonal_inches, eye_height_cm, viewing_distance_cm, viewing_angle_deg, furniture_height_cm, requested_clearance_cm);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {number} tv_weight_kg
 * @param {number} diagonal_inches
 * @param {number} vesa_width_mm
 * @param {number} vesa_height_mm
 * @param {string} requested_mechanism
 * @param {string} mounts_json
 * @returns {string}
 */
export function match_mounts_json(tv_weight_kg, diagonal_inches, vesa_width_mm, vesa_height_mm, requested_mechanism, mounts_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(requested_mechanism, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(mounts_json, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.match_mounts_json(retptr, tv_weight_kg, diagonal_inches, vesa_width_mm, vesa_height_mm, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @param {number} diagonal_inches
 * @param {number} eye_height_cm
 * @param {number} viewing_distance_cm
 * @param {number} viewing_angle_deg
 * @param {number} furniture_height_cm
 * @param {number} requested_clearance_cm
 * @param {number} vesa_vertical_offset_cm
 * @param {number} wall_plate_offset_cm
 * @returns {string}
 */
export function mounting_map_json(diagonal_inches, eye_height_cm, viewing_distance_cm, viewing_angle_deg, furniture_height_cm, requested_clearance_cm, vesa_vertical_offset_cm, wall_plate_offset_cm) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.mounting_map_json(retptr, diagonal_inches, eye_height_cm, viewing_distance_cm, viewing_angle_deg, furniture_height_cm, requested_clearance_cm, vesa_vertical_offset_cm, wall_plate_offset_cm);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {string} phone
 * @param {string} tv
 * @param {string} goal
 * @param {string} connector
 * @param {string} same_network
 * @param {string} hdmi
 * @param {string} android_video_output
 * @returns {string}
 */
export function phone_tv_connection_plan_json(phone, tv, goal, connector, same_network, hdmi, android_video_output) {
    let deferred8_0;
    let deferred8_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(phone, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(tv, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(goal, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(connector, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(same_network, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len4 = WASM_VECTOR_LEN;
        const ptr5 = passStringToWasm0(hdmi, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len5 = WASM_VECTOR_LEN;
        const ptr6 = passStringToWasm0(android_video_output, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len6 = WASM_VECTOR_LEN;
        wasm.phone_tv_connection_plan_json(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5, ptr6, len6);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred8_0 = r0;
        deferred8_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred8_0, deferred8_1, 1);
    }
}

/**
 * @param {number} diagonal_inches
 * @param {number} screen_center_height_cm
 * @param {number} eye_height_cm
 * @param {number} viewing_distance_cm
 * @param {number} maximum_down_tilt_degrees
 * @param {number} maximum_up_tilt_degrees
 * @returns {string}
 */
export function tilt_angle_plan_json(diagonal_inches, screen_center_height_cm, eye_height_cm, viewing_distance_cm, maximum_down_tilt_degrees, maximum_up_tilt_degrees) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.tilt_angle_plan_json(retptr, diagonal_inches, screen_center_height_cm, eye_height_cm, viewing_distance_cm, maximum_down_tilt_degrees, maximum_up_tilt_degrees);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {number} tv_width_cm
 * @param {number} vesa_offset_cm
 * @param {number} target_angle_degrees
 * @param {number} available_extension_cm
 * @param {number} safety_clearance_cm
 * @returns {string}
 */
export function turn_clearance_plan_json(tv_width_cm, vesa_offset_cm, target_angle_degrees, available_extension_cm, safety_clearance_cm) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.turn_clearance_plan_json(retptr, tv_width_cm, vesa_offset_cm, target_angle_degrees, available_extension_cm, safety_clearance_cm);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {string} mode
 * @param {number} primary
 * @param {number} secondary
 * @param {number} clearance_cm
 * @param {number} exact_case_width_cm
 * @param {number} exact_case_height_cm
 * @returns {string}
 */
export function tv_dimensions_plan_json(mode, primary, secondary, clearance_cm, exact_case_width_cm, exact_case_height_cm) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.tv_dimensions_plan_json(retptr, ptr0, len0, primary, secondary, clearance_cm, exact_case_width_cm, exact_case_height_cm);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @param {string} task
 * @param {string} primary
 * @param {string} secondary
 * @param {string} tertiary
 * @param {string} detail
 * @returns {string}
 */
export function tv_traffic_task_plan_json(task, primary, secondary, tertiary, detail) {
    let deferred6_0;
    let deferred6_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(task, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(primary, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(secondary, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(tertiary, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(detail, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len4 = WASM_VECTOR_LEN;
        wasm.tv_traffic_task_plan_json(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred6_0 = r0;
        deferred6_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred6_0, deferred6_1, 1);
    }
}

/**
 * @param {number} diagonal_inches
 * @param {number} screen_center_height_cm
 * @param {number} plate_width_cm
 * @param {number} plate_height_cm
 * @param {number} plate_horizontal_offset_cm
 * @param {number} plate_vertical_offset_cm
 * @param {number} socket_width_cm
 * @param {number} socket_height_cm
 * @param {number} socket_horizontal_offset_cm
 * @param {number} socket_vertical_offset_cm
 * @param {number} service_margin_cm
 * @param {number} required_depth_cm
 * @param {number} wall_clearance_cm
 * @param {number} powered_devices
 * @param {number} spare_power_modules
 * @param {number} ethernet_modules
 * @param {number} antenna_modules
 * @returns {string}
 */
export function tv_zone_socket_plan_json(diagonal_inches, screen_center_height_cm, plate_width_cm, plate_height_cm, plate_horizontal_offset_cm, plate_vertical_offset_cm, socket_width_cm, socket_height_cm, socket_horizontal_offset_cm, socket_vertical_offset_cm, service_margin_cm, required_depth_cm, wall_clearance_cm, powered_devices, spare_power_modules, ethernet_modules, antenna_modules) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.tv_zone_socket_plan_json(retptr, diagonal_inches, screen_center_height_cm, plate_width_cm, plate_height_cm, plate_horizontal_offset_cm, plate_vertical_offset_cm, socket_width_cm, socket_height_cm, socket_horizontal_offset_cm, socket_vertical_offset_cm, service_margin_cm, required_depth_cm, wall_clearance_cm, powered_devices, spare_power_modules, ethernet_modules, antenna_modules);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {number} measured_width
 * @param {number} measured_height
 * @param {string} measurement_unit
 * @param {string} mount_spec
 * @returns {string}
 */
export function vesa_match_plan_json(measured_width, measured_height, measurement_unit, mount_spec) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(measurement_unit, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(mount_spec, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len1 = WASM_VECTOR_LEN;
        wasm.vesa_match_plan_json(retptr, measured_width, measured_height, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred3_0, deferred3_1, 1);
    }
}

/**
 * @param {number | null | undefined} engagement_min_mm
 * @param {number | null | undefined} engagement_max_mm
 * @param {number} bracket_plate_thickness_mm
 * @param {number} washer_stack_thickness_mm
 * @param {number} required_spacer_thickness_mm
 * @returns {string}
 */
export function vesa_screw_length_plan_json(engagement_min_mm, engagement_max_mm, bracket_plate_thickness_mm, washer_stack_thickness_mm, required_spacer_thickness_mm) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vesa_screw_length_plan_json(retptr, !isLikeNone(engagement_min_mm), isLikeNone(engagement_min_mm) ? 0 : engagement_min_mm, !isLikeNone(engagement_max_mm), isLikeNone(engagement_max_mm) ? 0 : engagement_max_mm, bracket_plate_thickness_mm, washer_stack_thickness_mm, required_spacer_thickness_mm);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {string} mode
 * @param {number} value
 * @param {number} horizontal_angle_deg
 * @returns {string}
 */
export function viewing_geometry_json(mode, value, horizontal_angle_deg) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_export, wasm.__wbindgen_export2);
        const len0 = WASM_VECTOR_LEN;
        wasm.viewing_geometry_json(retptr, ptr0, len0, value, horizontal_angle_deg);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @param {number} diagonal_inches
 * @param {number} screen_width_cm
 * @param {number} screen_height_cm
 * @param {number} wall_width_cm
 * @param {number} wall_height_cm
 * @param {number} screen_center_x_cm
 * @param {number} screen_center_y_cm
 * @param {number} furniture_width_cm
 * @param {number} furniture_height_cm
 * @param {number} eye_line_height_cm
 * @returns {string}
 */
export function wall_scene_plan_json(diagonal_inches, screen_width_cm, screen_height_cm, wall_width_cm, wall_height_cm, screen_center_x_cm, screen_center_y_cm, furniture_width_cm, furniture_height_cm, eye_line_height_cm) {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.wall_scene_plan_json(retptr, diagonal_inches, screen_width_cm, screen_height_cm, wall_width_cm, wall_height_cm, screen_center_x_cm, screen_center_y_cm, furniture_width_cm, furniture_height_cm, eye_line_height_cm);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export3(deferred1_0, deferred1_1, 1);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
    };
    return {
        __proto__: null,
        "./krepitv_engine_bg.js": import0,
    };
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('krepitv_engine_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
