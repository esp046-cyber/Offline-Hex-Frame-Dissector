// Dictionaries mapping DNP3 codes to human-readable text (IEEE 1815).

export const LINK_PRIMARY_FC = {
  0: 'RESET_LINK_STATES', 1: 'RESET_USER_PROCESS (obsolete)', 2: 'TEST_LINK_STATES',
  3: 'CONFIRMED_USER_DATA', 4: 'UNCONFIRMED_USER_DATA', 9: 'REQUEST_LINK_STATUS'
};
export const LINK_SECONDARY_FC = {
  0: 'ACK', 1: 'NACK', 11: 'LINK_STATUS', 15: 'NOT_SUPPORTED'
};

export const APP_FC = {
  0: 'CONFIRM', 1: 'READ', 2: 'WRITE', 3: 'SELECT', 4: 'OPERATE', 5: 'DIRECT_OPERATE',
  6: 'DIRECT_OPERATE_NO_ACK', 7: 'IMMED_FREEZE', 8: 'IMMED_FREEZE_NO_ACK', 9: 'FREEZE_CLEAR',
  10: 'FREEZE_CLEAR_NO_ACK', 11: 'FREEZE_AT_TIME', 12: 'FREEZE_AT_TIME_NO_ACK',
  13: 'COLD_RESTART', 14: 'WARM_RESTART', 15: 'INITIALIZE_DATA', 16: 'INITIALIZE_APPLICATION',
  17: 'START_APPLICATION', 18: 'STOP_APPLICATION', 19: 'SAVE_CONFIGURATION',
  20: 'ENABLE_UNSOLICITED', 21: 'DISABLE_UNSOLICITED', 22: 'ASSIGN_CLASS',
  23: 'DELAY_MEASUREMENT', 24: 'RECORD_CURRENT_TIME', 25: 'OPEN_FILE', 26: 'CLOSE_FILE',
  27: 'DELETE_FILE', 28: 'GET_FILE_INFO', 29: 'AUTHENTICATE_FILE', 30: 'ABORT_FILE',
  31: 'ACTIVATE_CONFIG', 32: 'AUTHENTICATE_REQUEST', 33: 'AUTH_REQUEST_NO_ACK',
  129: 'RESPONSE', 130: 'UNSOLICITED_RESPONSE', 131: 'AUTHENTICATE_RESPONSE'
};
export const isResponseFC = fc => fc === 129 || fc === 130 || fc === 131;
// Requests that carry object data (not just headers)
export const DATA_REQUEST_FC = new Set([2, 3, 4, 5, 6, 22]);

// Severity: error = communication likely affected, warn = action needed, info = informational
export const IIN1_BITS = [
  { name: 'ALL_STATIONS', sev: 'info', desc: 'Broadcast message received.', hint: 'The last request was addressed to the broadcast address.' },
  { name: 'CLASS_1_EVENTS', sev: 'info', desc: 'Class 1 events available.', hint: 'Master should poll Class 1 (g60 v2) or events are queued.' },
  { name: 'CLASS_2_EVENTS', sev: 'info', desc: 'Class 2 events available.', hint: 'Master should poll Class 2 (g60 v3).' },
  { name: 'CLASS_3_EVENTS', sev: 'info', desc: 'Class 3 events available.', hint: 'Master should poll Class 3 (g60 v4).' },
  { name: 'NEED_TIME', sev: 'warn', desc: 'Outstation needs time synchronisation.', hint: 'Master must Write g50 v1 (time and date). The bit clears after a successful time write; check the master time-sync interval.' },
  { name: 'LOCAL_CONTROL', sev: 'warn', desc: 'Some points are in local control.', hint: 'Remote commands may be rejected until the local/remote switch is returned to remote.' },
  { name: 'DEVICE_TROUBLE', sev: 'error', desc: 'Abnormal device condition (vendor specific).', hint: 'Check the RTU diagnostics; the outstation reports an internal problem.' },
  { name: 'DEVICE_RESTART', sev: 'error', desc: 'Device restarted.', hint: 'Master must clear it with Write g80 v1, index 7 = 0. If it keeps returning, the RTU is rebooting (power, watchdog or config issue).' }
];
export const IIN2_BITS = [
  { name: 'NO_FUNC_CODE_SUPPORT', sev: 'error', desc: 'Function code not supported.', hint: 'The master sent a function code this outstation does not implement.' },
  { name: 'OBJECT_UNKNOWN', sev: 'error', desc: 'Object/variation unknown.', hint: 'Check the point map: the requested group/variation is not supported.' },
  { name: 'PARAMETER_ERROR', sev: 'error', desc: 'Parameter error (bad qualifier, range or data).', hint: 'Check start/stop indexes or qualifier codes against the outstation point list.' },
  { name: 'EVENT_BUFFER_OVERFLOW', sev: 'error', desc: 'Event buffer overflow.', hint: 'Events were lost. Poll more often, increase the buffer or clear the cause of event bursts, then run an integrity poll.' },
  { name: 'ALREADY_EXECUTING', sev: 'warn', desc: 'Requested operation already executing.', hint: 'A previous operation on the same point is still in progress.' },
  { name: 'CONFIG_CORRUPT', sev: 'error', desc: 'Configuration corrupt.', hint: 'Reload the outstation configuration.' },
  { name: 'RESERVED_2', sev: 'info', desc: 'Reserved bit 6 (should be 0).', hint: 'Should always be 0.' },
  { name: 'RESERVED_1', sev: 'info', desc: 'Reserved bit 7 (should be 0).', hint: 'Should always be 0.' }
];

// Group -> { name, vars: { variation: { name, size } } }. size = bytes per object (null = bit-packed).
const v = (name, size) => ({ name, size });
export const OBJECTS = {
  1:  { name: 'Binary Input', vars: { 1: v('Packed format', null), 2: v('With flags', 1) } },
  2:  { name: 'Binary Input Event', vars: { 1: v('Without time', 1), 2: v('Absolute time', 7), 3: v('Relative time', 3) } },
  3:  { name: 'Double-bit Input', vars: { 1: v('Packed format', null), 2: v('With flags', 1) } },
  4:  { name: 'Double-bit Input Event', vars: { 1: v('Without time', 1), 2: v('Absolute time', 7), 3: v('Relative time', 3) } },
  10: { name: 'Binary Output', vars: { 1: v('Packed format', null), 2: v('Output status with flags', 1) } },
  11: { name: 'Binary Output Event', vars: { 1: v('Status without time', 1), 2: v('Status with time', 7) } },
  12: { name: 'Control Relay Output Block', vars: { 1: v('CROB', 11) } },
  20: { name: 'Counter', vars: { 1: v('32-bit with flag', 5), 2: v('16-bit with flag', 3), 5: v('32-bit no flag', 4), 6: v('16-bit no flag', 2) } },
  21: { name: 'Frozen Counter', vars: { 1: v('32-bit with flag', 5), 2: v('16-bit with flag', 3), 5: v('32-bit with flag and time', 11), 6: v('16-bit with flag and time', 9), 9: v('32-bit no flag', 4), 10: v('16-bit no flag', 2) } },
  22: { name: 'Counter Event', vars: { 1: v('32-bit with flag', 5), 2: v('16-bit with flag', 3), 5: v('32-bit with flag and time', 11), 6: v('16-bit with flag and time', 9) } },
  30: { name: 'Analog Input', vars: { 1: v('32-bit with flag', 5), 2: v('16-bit with flag', 3), 3: v('32-bit no flag', 4), 4: v('16-bit no flag', 2), 5: v('Float with flag', 5), 6: v('Double with flag', 9) } },
  32: { name: 'Analog Input Event', vars: { 1: v('32-bit no time', 5), 2: v('16-bit no time', 3), 3: v('32-bit with time', 11), 4: v('16-bit with time', 9), 5: v('Float no time', 5), 6: v('Double no time', 9), 7: v('Float with time', 11), 8: v('Double with time', 15) } },
  40: { name: 'Analog Output Status', vars: { 1: v('32-bit with flag', 5), 2: v('16-bit with flag', 3), 3: v('Float with flag', 5), 4: v('Double with flag', 9) } },
  41: { name: 'Analog Output Block', vars: { 1: v('32-bit', 5), 2: v('16-bit', 3), 3: v('Float', 5), 4: v('Double', 9) } },
  50: { name: 'Time and Date', vars: { 1: v('Absolute time', 6), 3: v('Last recorded time', 6) } },
  51: { name: 'Common Time of Occurrence', vars: { 1: v('Synchronized', 6), 2: v('Unsynchronized', 6) } },
  52: { name: 'Time Delay', vars: { 1: v('Coarse', 2), 2: v('Fine', 2) } },
  60: { name: 'Class Data', vars: { 1: v('Class 0 (static)', 0), 2: v('Class 1 events', 0), 3: v('Class 2 events', 0), 4: v('Class 3 events', 0) } },
  80: { name: 'Internal Indications', vars: { 1: v('Packed format', null) } }
};

export function objectName(group, variation) {
  const g = OBJECTS[group];
  if (!g) return { group: `Unknown group ${group}`, variation: `v${variation}`, size: undefined };
  const va = g.vars[variation];
  return { group: g.name, variation: va ? va.name : `Unknown variation ${variation}`, size: va ? va.size : undefined };
}

export const QUALIFIER_RANGE = {
  0: '1-byte start/stop', 1: '2-byte start/stop', 2: '4-byte start/stop',
  3: '1-byte start/stop (virtual)', 4: '2-byte start/stop (virtual)', 5: '4-byte start/stop (virtual)',
  6: 'All objects (no range)', 7: '1-byte count', 8: '2-byte count', 9: '4-byte count', 11: 'Variable-format count'
};
export const QUALIFIER_PREFIX = {
  0: 'No prefix', 1: '1-byte index', 2: '2-byte index', 3: '4-byte index',
  4: '1-byte object size', 5: '2-byte object size', 6: '4-byte object size'
};
