// src/Auth/Cadastro.jsx
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseClient";

// --------- Helpers de formatação ----------
function formatPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(
      /^(\d{0,2})(\d{0,4})(\d{0,4}).*$/,
      (_, a, b, c) => [a && `(${a})`, b, c && `-${c}`].filter(Boolean).join(" ")
    );
  }
  return d.replace(
    /^(\d{2})(\d{5})(\d{0,4}).*$/,
    (_, a, b, c) => `(${a}) ${b}${c ? `-${c}` : ""}`
  );
}

function formatCpf(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(
    /^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2}).*$/,
    (_, a, b, c, d4) =>
      [a, b, c].filter(Boolean).join(".") + (d4 ? `-${d4}` : "")
  );
}

// ---------- Componente ----------
export default function Cadastro() {
  const [form, setForm] = useState({
    nome: "",
    fazenda: "",
    email: "",
    telefone: "",
    cpf: "",
    senha: "",
    confirmar: "",
  });

  const [erro, setErro] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const navigate = useNavigate();

  // ---------- Validação ----------
  const validar = () => {
    if (
      !form.nome ||
      !form.email ||
      !form.telefone ||
      !form.cpf ||
      !form.senha ||
      !form.confirmar
    ) {
      setErro("Preencha todos os campos obrigatórios.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErro("E-mail inválido.");
      return false;
    }

    const telDigitos = form.telefone.replace(/\D/g, "");
    if (telDigitos.length < 10) {
      setErro("Telefone inválido.");
      return false;
    }

    const cpfDigitos = form.cpf.replace(/\D/g, "");
    if (cpfDigitos.length !== 11) {
      setErro("CPF deve ter 11 dígitos.");
      return false;
    }

    if (form.senha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres.");
      return false;
    }

    if (form.senha !== form.confirmar) {
      setErro("As senhas não conferem.");
      return false;
    }

    setErro("");
    return true;
  };

  // ---------- Submit (usando OTP + metadata) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;

    const emailTrim = form.email.trim().toLowerCase();
    const telDigitos = form.telefone.replace(/\D/g, "");
    const cpfDigitos = form.cpf.replace(/\D/g, "");

    try {
      setErro("");

      // guarda TODOS os dados localmente para usar após o OTP
      const pendingCadastro = {
        nome: form.nome.trim(),
        fazenda: form.fazenda.trim(),
        email: emailTrim,
        telefone: telDigitos,
        cpf: cpfDigitos,
        senha: form.senha, // só será enviada ao Supabase depois da verificação
      };
      localStorage.setItem("pendingCadastro", JSON.stringify(pendingCadastro));

      // envia o código de 6 dígitos para o e-mail
      // e já grava os metadados no auth.users.raw_user_meta_data
      const { data, error } = await supabase.auth.signInWithOtp({
        email: emailTrim,
        options: {
          shouldCreateUser: true, // cria o usuário caso ainda não exista
          data: {
            full_name: form.nome.trim(),
            phone: telDigitos,
            cpf: cpfDigitos,
            fazenda: form.fazenda.trim(),
          },
        },
      });

      console.log("signInWithOtp:", data, error);

      if (error) {
        setErro(error.message || "Erro ao enviar código para o e-mail.");
        toast.error(error.message || "Erro ao enviar código para o e-mail.");
        return;
      }

      toast.success(
        "Enviamos um código de 6 dígitos para o seu e-mail. Digite-o para concluir o cadastro."
      );

      navigate("/verificar-email", { replace: true });
    } catch (err) {
      console.error(err);
      setErro("Erro inesperado ao cadastrar.");
      toast.error("Erro inesperado ao cadastrar.");
    }
  };

  // ---------- Estilos ----------
  const containerStyle = {
    minHeight: "100vh",
    width: "100%",
    margin: 0,
    padding: 0,
    backgroundImage: "url('/icones/telafundo.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const panelStyle = {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: "28px 32px",
    borderRadius: 24,
    boxShadow: "0 10px 28px rgba(0,0,0,.18)",
    width: "min(92vw, 540px)",
    maxWidth: 540,
  };

  const labelStyle = {
    fontSize: 12,
    marginBottom: 4,
    color: "#374151",
    fontWeight: 600,
  };

  const inputBase = {
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: "0.94rem",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "#fff",
  };

  const grid2 = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    alignItems: "center",
  };

  const senhaWrapper = {
    position: "relative",
    width: "100%",
  };

  const inputSenhaBase = {
    ...inputBase,
    paddingRight: 38,
  };

  const botaoOlhoStyle = {
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
          Bem-vindo ao Gestão Leiteira
        </p>
        <h2
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 22,
            margin: "6px 0 18px",
          }}
        >
          Cadastro
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

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome *</label>
            <input
              type="text"
              placeholder="Seu nome"
              value={form.nome}
              onChange={(e) =>
                setForm((f) => ({ ...f, nome: e.target.value }))
              }
              style={{ ...inputBase, textTransform: "capitalize" }}
              autoFocus
            />
          </div>

          {/* Fazenda + Telefone */}
          <div style={grid2}>
            <div>
              <label style={labelStyle}>Fazenda</label>
              <input
                type="text"
                placeholder="Ex: Fazenda Esperança"
                value={form.fazenda}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fazenda: e.target.value }))
                }
                style={{ ...inputBase, textTransform: "capitalize" }}
              />
            </div>

            <div>
              <label style={labelStyle}>Telefone *</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="(99) 99999-9999"
                value={form.telefone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    telefone: formatPhone(e.target.value),
                  }))
                }
                maxLength={16}
                style={inputBase}
              />
            </div>
          </div>

          {/* CPF */}
          <div>
            <label style={labelStyle}>CPF *</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) =>
                setForm((f) => ({ ...f, cpf: formatCpf(e.target.value) }))
              }
              maxLength={14}
              style={inputBase}
            />
          </div>

          {/* E-mail */}
          <div>
            <label style={labelStyle}>E-mail *</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              style={inputBase}
            />
          </div>

          {/* Senha + Confirmar */}
          <div style={grid2}>
            <div style={senhaWrapper}>
              <label style={labelStyle}>Senha *</label>
              <input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Crie uma senha"
                value={form.senha}
                onChange={(e) =>
                  setForm((f) => ({ ...f, senha: e.target.value }))
                }
                style={inputSenhaBase}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                style={botaoOlhoStyle}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={senhaWrapper}>
              <label style={labelStyle}>Confirmar *</label>
              <input
                type={mostrarConfirmar ? "text" : "password"}
                placeholder="Repita a senha"
                value={form.confirmar}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmar: e.target.value }))
                }
                style={inputSenhaBase}
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar((v) => !v)}
                style={botaoOlhoStyle}
              >
                {mostrarConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Botão */}
          <button
            type="submit"
            style={{
              backgroundColor: "#1565c0",
              color: "#fff",
              borderRadius: 30,
              padding: "10px 18px",
              fontWeight: 700,
              border: "none",
              width: 220,
              margin: "12px auto 0",
              cursor: "pointer",
            }}
          >
            Cadastrar
          </button>
        </form>
      </div>
    </div>
  );
}
