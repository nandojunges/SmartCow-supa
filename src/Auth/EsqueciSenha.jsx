// src/Auth/EsqueciSenha.jsx
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseClient";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregandoEnvio, setCarregandoEnvio] = useState(false);
  const [carregandoReset, setCarregandoReset] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  // 1) Enviar e-mail com código (OTP)
  const enviarCodigo = async (e) => {
    e.preventDefault();
    const eTrim = email.trim().toLowerCase();

    if (!eTrim) {
      setErro("Informe seu e-mail.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eTrim)) {
      setErro("E-mail inválido.");
      return;
    }

    setErro("");
    setCarregandoEnvio(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(eTrim, {
        redirectTo: window.location.origin + "/esqueci-senha",
      });

      if (error) {
        console.error(error);
        setErro(error.message || "Erro ao enviar o e-mail.");
        toast.error(error.message || "Erro ao enviar o e-mail.");
        setCarregandoEnvio(false);
        return;
      }

      setEmailEnviado(true);
      toast.success("Código enviado para o seu e-mail.");
    } catch (err) {
      console.error(err);
      setErro("Erro inesperado ao enviar o e-mail.");
      toast.error("Erro inesperado ao enviar o e-mail.");
    } finally {
      setCarregandoEnvio(false);
    }
  };

  // 2) Confirmar código + trocar senha
  const confirmarCodigo = async (e) => {
    e.preventDefault();
    const eTrim = email.trim().toLowerCase();
    const token = codigo.trim();
    const senha = novaSenha.trim();
    const confirma = confirmarSenha.trim();

    if (!token) {
      setErro("Digite o código que chegou no e-mail.");
      return;
    }
    if (senha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não conferem.");
      return;
    }

    setErro("");
    setCarregandoReset(true);

    try {
      // 2.1) Verifica o código de recuperação
      const { data, error } = await supabase.auth.verifyOtp({
        email: eTrim,
        token,
        type: "recovery", // 👈 fluxo de reset de senha
      });

      console.log("verifyOtp(recovery):", data, error);

      if (error) {
        console.error(error);
        setErro(error.message || "Código inválido ou expirado.");
        toast.error(error.message || "Código inválido ou expirado.");
        setCarregandoReset(false);
        return;
      }

      // 2.2) Com o token válido, atualiza a senha do usuário
      const { error: updateError } = await supabase.auth.updateUser({
        password: senha,
      });

      if (updateError) {
        console.error(updateError);
        setErro(updateError.message || "Erro ao redefinir senha.");
        toast.error(updateError.message || "Erro ao redefinir senha.");
        setCarregandoReset(false);
        return;
      }

      toast.success("Senha redefinida com sucesso! Faça login novamente.");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);
      setErro("Erro inesperado ao redefinir a senha.");
      toast.error("Erro inesperado ao redefinir a senha.");
    } finally {
      setCarregandoReset(false);
    }
  };

  // ---- estilos básicos (mesmo visual das outras telas) ----
  const containerStyle = {
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    padding: 0,
    backgroundImage: "url('/icones/telafundo.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Inter', 'Poppins', sans-serif",
  };

  const panelStyle = {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: "28px 32px",
    borderRadius: 24,
    boxShadow: "0 10px 28px rgba(0,0,0,.18)",
    width: "min(92vw, 460px)",
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: "0.94rem",
    boxSizing: "border-box",
  };

  const senhaWrapper = {
    position: "relative",
    width: "100%",
  };

  const botaoOlho = {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
  };

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#6b7280",
            margin: 0,
          }}
        >
          Recuperação de senha
        </p>
        <h2
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 20,
            margin: "6px 0 16px",
          }}
        >
          {emailEnviado ? "Digite o código" : "Informe seu e-mail"}
        </h2>

        {erro && (
          <div
            style={{
              marginBottom: 10,
              color: "#dc2626",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {erro}
          </div>
        )}

        {!emailEnviado ? (
          <form
            onSubmit={enviarCodigo}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              E-mail cadastrado
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={carregandoEnvio}
              style={{
                backgroundColor: "#1565c0",
                color: "#fff",
                borderRadius: 30,
                padding: "10px 18px",
                fontWeight: 700,
                border: "none",
                width: 220,
                margin: "16px auto 0",
                cursor: "pointer",
                opacity: carregandoEnvio ? 0.7 : 1,
              }}
            >
              {carregandoEnvio ? "Enviando..." : "Enviar código"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 12,
                color: "#2563eb",
                textDecoration: "underline",
                marginTop: 8,
                cursor: "pointer",
              }}
            >
              Voltar ao login
            </button>
          </form>
        ) : (
          <form
            onSubmit={confirmarCodigo}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <p
              style={{
                fontSize: 13,
                color: "#4b5563",
                textAlign: "center",
                marginBottom: 4,
              }}
            >
              Enviamos um código de 6 dígitos para:
              <br />
              <strong>{email}</strong>
            </p>

            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Código
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="••••••"
              maxLength={6}
              value={codigo}
              onChange={(e) =>
                setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              style={{
                ...inputStyle,
                textAlign: "center",
                letterSpacing: "4px",
                fontSize: "1.1rem",
              }}
            />

            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Nova senha
            </label>
            <div style={senhaWrapper}>
              <input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                style={{ ...inputStyle, paddingRight: 38 }}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                style={botaoOlho}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
              Confirmar nova senha
            </label>
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Repita a nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={carregandoReset}
              style={{
                backgroundColor: "#1565c0",
                color: "#fff",
                borderRadius: 30,
                padding: "10px 18px",
                fontWeight: 700,
                border: "none",
                width: 220,
                margin: "16px auto 0",
                cursor: "pointer",
                opacity: carregandoReset ? 0.7 : 1,
              }}
            >
              {carregandoReset ? "Confirmando..." : "Resetar senha"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailEnviado(false);
                setCodigo("");
                setNovaSenha("");
                setConfirmarSenha("");
              }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 12,
                color: "#2563eb",
                textDecoration: "underline",
                marginTop: 8,
                cursor: "pointer",
              }}
            >
              Reenviar código para outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
