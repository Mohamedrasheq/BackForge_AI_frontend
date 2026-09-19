type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter = async () => null;

export function setApiTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

export async function getApiToken(): Promise<string | null> {
  try {
    return await tokenGetter();
  } catch {
    return null;
  }
}
