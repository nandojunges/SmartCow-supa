// src/Auth/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { canUseOffline, saveOfflineSession } from "../offline/offlineAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [erroEmail, setErroEmail] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [offlineError, setOfflineError] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.background = "none";

    const salvo = localStorage.getItem("rememberEmail");
    if (salvo) {
      setEmail(salvo);
      setLembrar(true);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const validar = () => {
    let ok = true;
    const emailTrim = email.trim();
    const senhaTrim = senha.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setErroEmail("Email inválido");
      ok = false;
    } else {
      setErroEmail("");
    }

    if (!senhaTrim) {
      setErroSenha("Senha obrigatória");
      ok = false;
    } else {
      setErroSenha("");
    }

    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    setCarregando(true);
    setOfflineError("");

    try {
      const emailTrim = email.trim().toLowerCase();
      const senhaTrim = senha.trim();

      if (!navigator.onLine) {
        const allowedOffline = await canUseOffline();
        if (allowedOffline) {
          navigate("/inicio", { replace: true });
          return;
        }
        setOfflineError(
          "Modo offline indisponível. Faça login online pelo menos 1 vez neste dispositivo."
        );
        return;
      }

      // 1) Login no Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrim,
        password: senhaTrim,
      });

      if (error) {
        console.error("Erro login:", error);
        alert(error.message || "Email ou senha incorretos.");
        setCarregando(false);
        return;
      }

      if (lembrar) {
        localStorage.setItem("rememberEmail", emailTrim);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      // 2) Usuário autenticado
      const user = data?.user;
      const userId = user?.id;

      if (!userId) {
        console.warn("Login sem userId, mandando para /inicio");
        navigate("/inicio", { replace: true });
        return;
      }

      await saveOfflineSession({
        userId,
        email: user.email,
        savedAtISO: new Date().toISOString(),
      });

      // 3) Busca o perfil pela COLUNA id (auth.uid() == profiles.id)
      const { data: perfil, error: perfilError } = await supabase
        .from("profiles")
        .select("id, role, email")
        .eq("id", userId)
        .maybeSingle(); // não explode se não achar

      if (perfilError) {
        console.warn("Erro ao buscar perfil:", perfilError.message);
      }

      let role = "usuario";

      if (perfil && perfil.role) {
        role = String(perfil.role).trim().toLowerCase();
      }

      // 🔍 DEBUG: ver o que está vindo
      console.log("DEBUG LOGIN:", {
        userId,
        emailAuth: user.email,
        perfilRecebido: perfil,
        roleCalculado: role,
      });
      // isso é só provisório pra você ver na tela
      alert(
        `DEBUG\nuserId: ${userId}\nemail auth: ${user.email}\nrole detectado: ${role}\nperfil.id: ${
          perfil?.id || "nenhum"
        }`
      );

      // 4) Decide rota com base no role
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/inicio", { replace: true });
      }
    } catch (err) {
      console.error("Erro geral no login:", err);
      alert("Erro ao fazer login. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        backgroundImage: "url('/icones/telafundo.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        fontFamily: "'Inter', 'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.85)",
          padding: "32px 36px",
          borderRadius: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          width: "380px",
          marginRight: "80px",
        }}
      >
        <p
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          Bem-vindo ao SmartCow!
        </p>

        <h2
          style={{
            textAlign: "center",
            fontWeight: "bold",
            marginBottom: "20px",
            color: "#1e3a8a",
          }}
        >
          Login
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div>
            <label>Email</label>
            <input
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
            {erroEmail && (
              <p style={{ color: "red", fontSize: "0.8rem" }}>{erroEmail}</p>
            )}
          </div>

          <div>
            <label>Senha</label>
            <input
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
            {erroSenha && (
              <p style={{ color: "red", fontSize: "0.8rem" }}>{erroSenha}</p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "space-between",
              marginTop: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
              />
              <label>Lembrar-me</label>
            </div>

            <Link
              to="/esqueci-senha"
              style={{
                fontSize: "0.85rem",
                color: "#1e3a8a",
                textDecoration: "underline",
              }}
            >
              Esqueci a senha
            </Link>
          </div>

          <button
            type="submit"
            disabled={carregando}
            style={{
              background: "linear-gradient(90deg, #1e3a8a, #3b82f6)",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "30px",
              border: "none",
              fontSize: "1.1rem",
              fontWeight: "600",
              cursor: "pointer",
              marginTop: "10px",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          {offlineError && (
            <div
              style={{
                marginTop: "8px",
                padding: "10px 12px",
                background: "#fff7ed",
                border: "1px solid #fdba74",
                borderRadius: "8px",
                color: "#9a3412",
                fontSize: "0.9rem",
              }}
            >
              {offlineError}
            </div>
          )}

          {canInstall && (
            <button
              type="button"
              onClick={handleInstallClick}
              style={{
                width: "100%",
                borderRadius: "30px",
                border: "1px solid #1e3a8a",
                background: "#ffffff",
                color: "#1e3a8a",
                padding: "12px 24px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                marginTop: "8px",
              }}
            >
              Instalar SmartCow
            </button>
          )}
        </form>

        <div
          style={{
            marginTop: "14px",
            textAlign: "center",
            fontSize: "0.9rem",
          }}
        >
          <span>Não tem conta? </span>
          <Link
            to="/cadastro"
            style={{
              color: "#1e3a8a",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
