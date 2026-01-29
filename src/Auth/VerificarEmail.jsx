// src/Auth/VerificarEmail.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-toastify";
import { useFazenda } from "../context/FazendaContext";

export default function VerificarEmail() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [cadastro, setCadastro] = useState(null); // dados salvos no localStorage
  const navigate = useNavigate();
  const { clearFazendaAtualId } = useFazenda();

  useEffect(() => {
    const salvo = localStorage.getItem("pendingCadastro");

    if (!salvo) {
      navigate("/cadastro", { replace: true });
      return;
    }

    try {
      const obj = JSON.parse(salvo);
      if (!obj?.email) {
        navigate("/cadastro", { replace: true });
        return;
      }
      setCadastro(obj);
      setEmail(obj.email);
    } catch (e) {
      console.error("Erro ao ler pendingCadastro:", e);
      navigate("/cadastro", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!codigo.trim()) {
      setErro("Digite o código enviado para o seu e-mail.");
      return;
    }

    if (!cadastro) {
      setErro("Dados do cadastro não encontrados. Refaça o cadastro.");
      navigate("/cadastro", { replace: true });
      return;
    }

    setErro("");

    try {
      const tipoConta = cadastro?.tipo_conta || cadastro?.tipoConta || "PRODUTOR";
      // 1) Verifica o código recebido por e-mail (OTP)
      const { data, error } = await supabase.auth.verifyOtp({
        email: cadastro.email,
        token: codigo.trim(),
        type: "email", // verifica código de e-mail
      });

      console.log("verifyOtp:", data, error);

      if (error) {
        setErro(error.message || "Código inválido ou expirado.");
        toast.error(error.message || "Código inválido ou expirado.");
        return;
      }

      // 2) Já autenticado → define a senha e metadata
      const metadata = {
        full_name: cadastro.nome,
        phone: cadastro.telefone,
        cpf: cadastro.cpf,
        tipo_conta: tipoConta,
        ...(tipoConta === "PRODUTOR" ? { fazenda: cadastro.fazenda } : {}),
      };

      const { error: updateError } = await supabase.auth.updateUser({
        password: cadastro.senha,
        data: metadata,
      });

      if (updateError) {
        console.error("Erro em updateUser:", updateError);
        toast.error(
          updateError.message ||
            "E-mail confirmado, mas houve erro ao salvar seus dados."
        );
        // mesmo com erro de updateUser o login está ativo, então segue pro app
      } else {
        toast.success("Cadastro concluído com sucesso!");
      }

      const userId = data?.user?.id ?? data?.session?.user?.id;

      let tipoContaFinal = tipoConta;

      if (userId) {
        const profilePayload = {
          id: userId,
          full_name: cadastro.nome,
          email: cadastro.email,
          phone: cadastro.telefone,
          cpf: cadastro.cpf,
          tipo_conta: tipoConta,
          fazenda: tipoConta === "PRODUTOR" ? cadastro.fazenda : null,
        };

        const { data: perfilAtualizado, error: profileError } = await supabase
          .from("profiles")
          .upsert(profilePayload, { onConflict: "id" })
          .select("tipo_conta")
          .maybeSingle();

        if (profileError) {
          console.error("Erro ao salvar profile:", profileError);
          toast.error(
            profileError.message ||
              "Cadastro concluído, mas houve erro ao salvar o perfil."
          );
        } else if (perfilAtualizado?.tipo_conta) {
          tipoContaFinal = perfilAtualizado.tipo_conta;
        }
      } else {
        console.warn("verifyOtp sem userId para criar profile.");
      }

      // limpar storage e seguir para o sistema
      localStorage.removeItem("pendingCadastro");

      if (String(tipoContaFinal ?? "").trim().toUpperCase() === "ASSISTENTE_TECNICO") {
        clearFazendaAtualId();
        navigate("/tecnico", { replace: true });
        return;
      }

      navigate("/inicio", { replace: true });
    } catch (err) {
      console.error(err);
      setErro("Erro inesperado ao verificar código.");
      toast.error("Erro inesperado ao verificar código.");
    }
  };

  const containerStyle = {
    minHeight: "100vh",
    width: "100%",
    backgroundImage: "url('/icones/telafundo.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const panelStyle = {
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: "24px 28px",
    borderRadius: 24,
    boxShadow: "0 10px 28px rgba(0,0,0,.18)",
    width: "min(92vw, 420px)",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: "1rem",
    textAlign: "center",
    letterSpacing: "4px",
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
          Confirmação de e-mail
        </p>
        <h2
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: 20,
            margin: "6px 0 14px",
          }}
        >
          Digite o código
        </h2>

        <p
          style={{
            fontSize: 13,
            color: "#4b5563",
            textAlign: "center",
            marginBottom: 14,
          }}
        >
          Enviamos um código de 6 dígitos para:
          <br />
          <strong>{email}</strong>
        </p>

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
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <input
            type="text"
            inputMode="numeric"
            placeholder="••••••"
            maxLength={6}
            value={codigo}
            onChange={(e) =>
              setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            style={inputStyle}
          />

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
              margin: "10px auto 0",
              cursor: "pointer",
            }}
          >
            Confirmar
          </button>

          <button
            type="button"
            onClick={() => navigate("/cadastro")}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 12,
              color: "#2563eb",
              textDecoration: "underline",
              marginTop: 4,
              cursor: "pointer",
            }}
          >
            Voltar para o cadastro
          </button>
        </form>
      </div>
    </div>
  );
}
