import { UNIT, unitNumber } from "$lib/units";
import type { Unit } from "mathjs";

export interface FieldDefinition {
  name: string;
  value: Unit;
  katexName: string;
  label: string;
  icon?: string;
  recompute?: true;
  locked?: true;
}

export function createFieldsData(katexData: Record<string, string>): Map<string, FieldDefinition> {
  type DefWithoutKatex = Omit<FieldDefinition, "katexName"> & Partial<FieldDefinition>;

  const map = new Map<string, DefWithoutKatex>(([
    {
      name: "v_in",
      value: unitNumber(20, UNIT.V),
      label: "Input Voltage",
      icon: "voltage",
    },
    {
      name: "v_led",
      value: unitNumber(3.4, UNIT.V),
      label: "LED Forward Voltage",
      icon: "voltage",
    },
    {
      name: "i_led",
      value: unitNumber(0, UNIT.mA),
      label: "LED Current",
      icon: "current",
      recompute: true,
    },
    {
      name: "v_d",
      value: unitNumber(450, UNIT.mV),
      label: "Flyback Diode Forward Voltage",
      icon: "diode",
    },
    {
      name: "r_s",
      value: unitNumber(150, UNIT.mohm),
      label: "Current Sense Resistance",
      icon: "resistor",
    },
    {
      name: "l",
      value: unitNumber(47, UNIT.uH),
      label: "Inductor Value",
      icon: "inductor",
    },
    {
      name: "r_l",
      value: unitNumber(300, UNIT.mohm),
      label: "Inductor Resistance",
      icon: "resistor",
    },
    // IC Specification
    {
      name: "v_s",
      value: unitNumber(100, UNIT.mV),
      label: "Current Sense Voltage",
      icon: "voltage",
      locked: true,
    },
    {
      name: "ripple_mult",
      value: unitNumber(0.26, UNIT.NONE),
      label: "Ripple Factor",
      locked: true,
    },
    {
      name: "ripple",
      value: unitNumber(0, UNIT.mA),
      label: "Ripple",
      icon: "current-ripple",
      recompute: true,
    },
    {
      name: "r_lx",
      value: unitNumber(200, UNIT.mohm),
      label: "Switch Resistance",
      icon: "resistor",
      locked: true,
    },
    // Switching Characteristics
    {
      name: "t_on",
      value: unitNumber(0, UNIT.ns),
      label: "On Time",
      icon: "time",
      recompute: true,
    },
    {
      name: "t_off",
      value: unitNumber(0, UNIT.ns),
      label: "Off Time",
      icon: "time",
      recompute: true,
    },
    {
      name: "d",
      value: unitNumber(0, UNIT.NONE),
      label: "Duty Cycle",
      icon: "pwm",
      recompute: true,
    },
    {
      name: "f_sw",
      value: unitNumber(0, UNIT.kHz),
      label: "Switch Frequency",
      icon: "time",
      recompute: true,
    },
  ] satisfies DefWithoutKatex[]).map(it => [it.name, it]));

  for (const field of map.values()) {
    field.katexName = katexData[field.name] ?? "";
  }

  return map as Map<string, FieldDefinition>;
}
