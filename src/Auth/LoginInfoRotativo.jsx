import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Arquivos de texto esperados em public/data/rotativos/
const ARQUIVOS = ["01.txt", "02.txt", "03.txt"];
const BASE_TEXT_PATH = "/data/rotativos";

// Converte o conteúdo "chave: valor" em objeto
function parseRotativo(text) {
  const obj = { titulo: "", mensagem: "", mostrarImagem: false, imagem: "", tempo: 5 };
  const linhas = text
    .replace(/^\uFEFF/, "") // remove BOM se houver
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const linha of linhas) {
    const idx = linha.indexOf(":");
    if (idx === -1) continue;
    const chave = linha.slice(0, idx).trim();
    const valor = linha.slice(idx + 1).trim();
    obj[chave] = valor;
  }

  obj.mostrarImagem = String(obj.mostrarImagem).toLowerCase() === "true";
  const t = parseInt(obj.tempo, 10);
  obj.tempo = Number.isFinite(t) && t > 0 ? t : 5;

  return obj;
}

// Resolve caminho de imagem: http(s), absoluto (/...), ou assume em /imagens/
function resolveImgPath(p) {
  if (!p) return "";
  const s = p.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return s.replace(/^\/api\//, "/"); // remove /api se veio assim
  return `/imagens/${s}`; // coloque em public/imagens/
}

export default function LoginInfoRotativo() {
  const [infos, setInfos] = useState([]);
  const [indice, setIndice] = useState(0);
  const [visivel, setVisivel] = useState(true);

  // Carrega os arquivos de texto (sem /api)
  useEffect(() => {
    let ativo = true;
    const ac = new AbortController();

    (async () => {
      const resultados = await Promise.all(
        ARQUIVOS.map(async (nome) => {
          try {
            const r = await fetch(`${BASE_TEXT_PATH}/${nome}`, { signal: ac.signal });
            if (!r.ok) return null; // ignora 404
            const texto = await r.text();
            return parseRotativo(texto);
          } catch {
            return null;
          }
        })
      );

      if (!ativo) return;
      const lista = resultados.filter(Boolean);
      setInfos(
        lista.length
          ? lista
          : [
              {
                titulo: "Bem-vindo!",
                mensagem:
                  "Crie 01.txt, 02.txt e 03.txt em public/data/rotativos/ no formato 'chave: valor'.",
                mostrarImagem: false,
                tempo: 5,
              },
            ]
      );
    })();

    return () => {
      ativo = false;
      ac.abort();
    };
  }, []);

  // Troca automática respeitando "tempo" de cada item
  useEffect(() => {
    if (!infos.length) return;
    const ms = (infos[indice]?.tempo || 5) * 1000;

    const t1 = setTimeout(() => {
      setVisivel(false);
      const t2 = setTimeout(() => {
        setIndice((i) => (i + 1) % infos.length);
        setVisivel(true);
      }, 450);
      return () => clearTimeout(t2);
    }, ms);

    return () => clearTimeout(t1);
  }, [indice, infos]);

  const item = infos[indice] || {};
  const imagens =
    item.mostrarImagem && item.imagem
      ? item.imagem.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AnimatePresence mode="wait">
        {visivel && (
          <motion.div
            key={indice}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.75)",
              padding: "28px",
              borderRadius: "16px",
              boxShadow: "0 8px 28px rgba(0, 0, 0, 0.12)",
              maxWidth: "520px",
              width: "100%",
              textAlign: "center",
              fontFamily: "'Inter', 'Poppins', sans-serif",
            }}
          >
            {!!item.titulo && (
              <h2
                style={{
                  fontSize: "1.6rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  marginBottom: "10px",
                }}
              >
                {item.titulo}
              </h2>
            )}

            {!!item.mensagem && (
              <p
                style={{
                  fontSize: "1rem",
                  color: "#334155",
                  lineHeight: "1.55",
                  marginBottom: imagens.length ? "14px" : 0,
                }}
              >
                {item.mensagem}
              </p>
            )}

            {imagens.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                {imagens.map((img, i) => (
                  <img
                    key={i}
                    src={resolveImgPath(img)}
                    alt=""
                    style={{
                      maxWidth: "200px",
                      borderRadius: "12px",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                      marginTop: "10px",
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
