import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';

function findEnvPath(startDirectory: string) {
  let currentDirectory = startDirectory;

  while (true) {
    const envPath = resolve(currentDirectory, '.env');

    if (existsSync(envPath)) {
      return envPath;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return undefined;
    }

    currentDirectory = parentDirectory;
  }
}

const envPath = findEnvPath(__dirname);

dotenv.config(envPath ? { path: envPath } : undefined);

function readRawEnv(name: string) {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  return value;
}

export function getStringEnv(name: string, defaultValue: string): string;
export function getStringEnv(name: string): string | undefined;
export function getStringEnv(name: string, defaultValue?: string) {
  const value = readRawEnv(name);
  return value ?? defaultValue;
}

export function getNumberEnv(name: string, defaultValue: number, minValue?: number): number;
export function getNumberEnv(name: string, defaultValue?: undefined, minValue?: number): number | undefined;
export function getNumberEnv(name: string, defaultValue?: number, minValue?: number) {
  const value = readRawEnv(name);

  if (value === undefined) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${name} numeric bir değer olmalı. Gelen değer: "${value}"`);
  }

  if (minValue !== undefined && parsedValue < minValue) {
    throw new Error(`${name} en az ${minValue} olmalı. Gelen değer: ${parsedValue}`);
  }

  return parsedValue;
}

export function getBooleanEnv(name: string, defaultValue: boolean) {
  const value = readRawEnv(name);

  if (value === undefined) {
    return defaultValue;
  }

  const normalizedValue = value.toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  throw new Error(`${name} boolean bir değer olmalı. Kabul edilen değerler: true/false, 1/0, yes/no, on/off.`);
}

export function getEnumEnv<const T extends readonly string[]>(name: string, allowedValues: T, defaultValue: T[number]) {
  const value = readRawEnv(name);

  if (value === undefined) {
    return defaultValue;
  }

  if (allowedValues.includes(value)) {
    return value as T[number];
  }

  throw new Error(`${name} şu değerlerden biri olmalı: ${allowedValues.join(', ')}. Gelen değer: "${value}"`);
}
