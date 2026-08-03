import type { Href } from 'expo-router';

const CLIENT_HOME = '/(client)' as const;

export function getClientReturnTo(value: string | string[] | undefined): Href {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === CLIENT_HOME || candidate?.startsWith(`${CLIENT_HOME}/`)
    ? candidate as Href
    : CLIENT_HOME;
}

export function clientAuthHref(
  pathname: '/(auth)/ClientLoginScreen' | '/(auth)/ClientRegisterScreen',
  returnTo: string,
): Href {
  return { pathname, params: { returnTo: getClientReturnTo(returnTo) } } as Href;
}