/*
 * Copyright (C) 2024 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @file asyncValue.ts - a module that provides an async view of a
 * number that you can subscribe to.
 */

import { sleep } from "@/utils/timeUtils";

let value = 42;
const listeners = new Set<() => void>();

export async function getCurrentValue(): Promise<{ value: number }> {
  await sleep(50);
  return {
    value,
  };
}

/** Helper to update the value in tests **/
export function setCurrentValue(newValue: number): void {
  value = newValue;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    unsubscribe(listener);
  };
}

export function unsubscribe(listener: () => void) {
  listeners.delete(listener);
}
