import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { endOtherSessions, isSessionGone, MANUAL_SIGNOUT_KEY, SessionGuard } from "./SessionGuard";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), getUser: vi.fn(), signOut: vi.fn(), unsubscribe: vi.fn(),
  listener: null as null | ((event: string, session: unknown) => void),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    getSession: mocks.getSession, getUser: mocks.getUser, signOut: mocks.signOut,
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => { mocks.listener = cb; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; },
  } },
}));

const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "t" } } });
});
afterEach(() => cleanup());

describe("sessão única por conta", () => {
  it("reconhece quando a sessão deixou de existir e ignora falha de rede", () => {
    expect(isSessionGone({ status: 403, code: "session_not_found" })).toBe(true);
    expect(isSessionGone({ status: 401 })).toBe(true);
    expect(isSessionGone({ message: "Invalid Refresh Token: Refresh Token Not Found" })).toBe(true);
    expect(isSessionGone({ status: 0, message: "Failed to fetch" })).toBe(false);
    expect(isSessionGone({ status: 500 })).toBe(false);
    expect(isSessionGone(null)).toBe(false);
  });

  it("o login novo encerra as sessões dos outros dispositivos", async () => {
    await endOtherSessions();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "others" });
  });

  it("o login continua válido mesmo se encerrar os outros falhar", async () => {
    mocks.signOut.mockRejectedValueOnce(new Error("rede"));
    await expect(endOtherSessions()).resolves.toBeUndefined();
  });

  it("desconecta este aparelho quando o servidor diz que a sessão não existe mais", async () => {
    mocks.getUser.mockResolvedValue({ error: { status: 403, code: "session_not_found" } });
    render(<SessionGuard />);
    await flush();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("mantém a sessão quando está tudo certo ou quando só há falha de rede", async () => {
    mocks.getUser.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { status: 0, message: "Failed to fetch" } });
    render(<SessionGuard />);
    await flush();
    window.dispatchEvent(new Event("focus"));
    await flush();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("não faz nada sem sessão (visitante)", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    render(<SessionGuard />);
    await flush();
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("saída pedida pelo próprio usuário não conta como derrubada", async () => {
    mocks.getUser.mockResolvedValue({ error: null });
    render(<SessionGuard />);
    await flush();
    window.sessionStorage.setItem(MANUAL_SIGNOUT_KEY, "1");
    mocks.listener?.("SIGNED_OUT", null);
    await flush();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(MANUAL_SIGNOUT_KEY)).toBeNull();
  });

  it("SIGNED_OUT inesperado (sessão revogada) desconecta este aparelho", async () => {
    mocks.getUser.mockResolvedValue({ error: null });
    render(<SessionGuard />);
    await flush();
    mocks.listener?.("SIGNED_OUT", null);
    await flush();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
