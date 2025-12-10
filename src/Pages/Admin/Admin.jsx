// src/pages/Admin/Admin.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function Admin() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  const navigate = useNavigate();

  // 🔹 Botão de sair
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro ao sair:", err);
    } finally {
      navigate("/login", { replace: true });
    }
  }

  // 🔹 Carregar sessão + verificar se é admin + listar usuários
  useEffect(() => {
    async function init() {
      setCarregando(true);
      try {
        // 1) Verifica sessão
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Erro ao obter sessão:", error.message);
        }
        const session = data?.session;

        if (!session) {
          navigate("/login", { replace: true });
          return;
        }

        const user = session.user;
        let role = null;

        // 2) Regra extra: teu e-mail sempre é admin
        if (user.email === "ferjunges@outlook.com") {
          role = "admin";
        } else {
          const { data: perfil, error: perfilError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (perfilError) {
            console.warn("Erro ao buscar perfil:", perfilError.message);
          }
          role = perfil?.role || null;
        }

        // se não for admin → manda embora
        if (role !== "admin") {
          navigate("/inicio", { replace: true });
          return;
        }

        // 3) É admin → carrega lista de usuários
        const { data: lista, error: listaError } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (listaError) {
          console.error("Erro ao buscar usuários:", listaError.message);
        } else if (lista) {
          setUsuarios(lista);
        }
      } catch (err) {
        console.error("Erro geral no Admin:", err);
      } finally {
        setCarregando(false);
      }
    }

    init();
  }, [navigate]);

  // 🔹 Bloquear / desbloquear usuário (role: usuario ↔ bloqueado)
  async function handleToggleBloqueio(usuario) {
    if (usuario.role === "admin") {
      alert("Você não pode bloquear outro administrador.");
      return;
    }

    const novoRole = usuario.role === "bloqueado" ? "usuario" : "bloqueado";

    if (
      !window.confirm(
        `Tem certeza que deseja ${
          novoRole === "bloqueado" ? "bloquear" : "desbloquear"
        } este usuário?`
      )
    ) {
      return;
    }

    try {
      setProcessandoId(usuario.id);
      const { error } = await supabase
        .from("profiles")
        .update({ role: novoRole })
        .eq("id", usuario.id);

      if (error) {
        console.error("Erro ao alterar role:", error.message);
        alert("Erro ao alterar status do usuário.");
        return;
      }

      // Atualiza estado local
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuario.id
            ? {
                ...u,
                role: novoRole,
              }
            : u
        )
      );
    } catch (err) {
      console.error("Erro no bloqueio:", err);
      alert("Erro ao alterar status.");
    } finally {
      setProcessandoId(null);
    }
  }

  // 🔹 Excluir usuário (apenas da tabela profiles)
  async function handleExcluir(usuario) {
    if (usuario.role === "admin") {
      alert("Você não pode excluir um administrador.");
      return;
    }

    if (
      !window.confirm(
        `Tem certeza que deseja excluir o usuário "${usuario.full_name}"?`
      )
    ) {
      return;
    }

    try {
      setProcessandoId(usuario.id);
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", usuario.id);

      if (error) {
        console.error("Erro ao excluir usuário:", error.message);
        alert("Erro ao excluir usuário.");
        return;
      }

      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
    } catch (err) {
      console.error("Erro no delete:", err);
      alert("Erro ao excluir usuário.");
    } finally {
      setProcessandoId(null);
    }
  }

  if (carregando) {
    return <p style={{ padding: 20 }}>Carregando...</p>;
  }

  return (
    <div style={{ padding: 30 }}>
      {/* Cabeçalho com título + botão sair */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Painel do Administrador</h1>
          <p style={{ color: "#555", marginTop: 4 }}>
            Lista de usuários cadastrados
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "8px 18px",
            borderRadius: "999px",
            border: "none",
            background: "#b91c1c",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>

      {usuarios.length === 0 ? (
        <p>Nenhum usuário cadastrado ainda.</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>CPF</th>
              <th>Fazenda</th>
              <th>Role</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td> {/* <- vem da coluna email da profiles */}
                <td>{u.phone}</td>
                <td>{u.cpf}</td>
                <td>{u.fazenda}</td>
                <td>{u.role}</td>
                <td>
                  <button
                    onClick={() => handleToggleBloqueio(u)}
                    disabled={processandoId === u.id}
                    style={{
                      marginRight: 8,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      background:
                        u.role === "bloqueado" ? "#22c55e" : "#eab308",
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    {u.role === "bloqueado" ? "Desbloquear" : "Bloquear"}
                  </button>

                  <button
                    onClick={() => handleExcluir(u)}
                    disabled={processandoId === u.id}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "none",
                      cursor: "pointer",
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
