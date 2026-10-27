
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCFzoybtl_55oiW0PdFTiw99pGKrBTe3Us",
  authDomain: "atividade-3fd3c.firebaseapp.com",
  projectId: "atividade-3fd3c",
  storageBucket: "atividade-3fd3c.firebasestorage.app",
  messagingSenderId: "565425203655",
  appId: "1:565425203655:web:0740845ca308f1d34dd1e2",
  measurementId: "G-VY6TXZ4GCT"
};

// INICIALIZAÇÃO
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const musicRef = collection(db, "musicas");

// ELEMENTOS HTML
const musicForm = document.getElementById("music-form");
const musicList = document.getElementById("music-list");
const musicMessage = document.getElementById("music-message");
const lyricsMessage = document.getElementById("lyrics-message");
const lyricsResult = document.getElementById("lyrics-result");
const saveLyricsButton = document.getElementById("save-lyrics");
const cancelEditButton = document.getElementById("cancel-edit");

let allMusics = [];
let editingId = null;
let foundLyrics = "";

// VERIFICAR SE OS ELEMENTOS PRINCIPAIS EXISTEM
if (!musicForm || !musicList || !musicMessage) {
  console.error(
    "Não encontrei os elementos necessários. Confira os IDs no index.html."
  );
} else {

  // CARREGAR MÚSICAS EM TEMPO REAL
  onSnapshot(
    query(musicRef, orderBy("criadoEm", "desc")),
    (snapshot) => {
      allMusics = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      renderMusics();
    },
    (error) => {
      console.error("Erro ao carregar músicas:", error);
      musicMessage.textContent =
        "Erro ao carregar o catálogo. Confira o Firebase e suas regras.";
    }
  );

  // ADICIONAR OU EDITAR MÚSICA
  musicForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const music = {
      titulo: document.getElementById("title").value.trim(),
      artista: document.getElementById("artist").value.trim(),
      comentario: document.getElementById("comment").value.trim(),
      nota: Number(document.getElementById("rating").value),
      letra: document.getElementById("lyrics").value.trim()
    };

    if (
      !music.titulo ||
      !music.artista ||
      !Number.isFinite(music.nota) ||
      music.nota < 0 ||
      music.nota > 10
    ) {
      musicMessage.textContent =
        "Informe o título, o artista e uma nota entre 0 e 10.";
      return;
    }

    musicMessage.textContent = "Salvando música...";

    try {
      if (editingId) {
        await updateDoc(doc(db, "musicas", editingId), music);
        musicMessage.textContent = "Música atualizada com sucesso!";
      } else {
        await addDoc(musicRef, {
          ...music,
          criadoEm: Date.now()
        });

        musicMessage.textContent = "Música adicionada ao catálogo!";
      }

      resetForm();
    } catch (error) {
      console.error("Erro ao salvar música:", error);
      musicMessage.textContent =
        "Não foi possível salvar. Confira a conexão e as regras do Firestore.";
    }
  });

  // EXIBIR O CATÁLOGO
  function renderMusics() {
    const filterElement = document.getElementById("filter");
    const filter = (filterElement?.value || "")
      .trim()
      .toLocaleLowerCase("pt-BR");

    musicList.replaceChildren();

    const filteredMusics = allMusics.filter((music) =>
      `${music.titulo || ""} ${music.artista || ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(filter)
    );

    if (filteredMusics.length === 0) {
      const emptyMessage = document.createElement("p");

      emptyMessage.textContent = allMusics.length
        ? "Nenhuma música encontrada."
        : "Ainda não há músicas. Adicione a primeira!";

      musicList.appendChild(emptyMessage);
      return;
    }

    filteredMusics.forEach((music) => {
      const card = document.createElement("article");
      card.className = "music-card";

      const title = document.createElement("h3");
      title.textContent = music.titulo || "Sem título";

      const artist = document.createElement("p");
      artist.textContent = `Artista: ${music.artista || "Não informado"}`;

      const comment = document.createElement("p");
      comment.textContent = music.comentario || "Sem comentário.";

      const rating = document.createElement("p");
      rating.textContent = `Nota: ${music.nota ?? "Não avaliada"}/10`;

      card.append(title, artist, comment, rating);

      if (music.letra) {
        const lyricsTitle = document.createElement("h4");
        lyricsTitle.textContent = "Letra";

        const lyrics = document.createElement("pre");
        lyrics.textContent = music.letra;
        lyrics.style.whiteSpace = "pre-wrap";
        lyrics.style.overflowWrap = "anywhere";

        card.append(lyricsTitle, lyrics);
      }

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const editButton = document.createElement("button");
      editButton.textContent = "Editar";
      editButton.addEventListener("click", () => {
        editMusic(music.id);
      });

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Excluir";
      deleteButton.className = "delete-button";
      deleteButton.addEventListener("click", () => {
        removeMusic(music.id);
      });

      actions.append(editButton, deleteButton);
      card.appendChild(actions);
      musicList.appendChild(card);
    });
  }

  // PREENCHER FORMULÁRIO PARA EDIÇÃO
  function editMusic(id) {
    const music = allMusics.find((item) => item.id === id);
    if (!music) return;

    editingId = id;

    document.getElementById("title").value = music.titulo || "";
    document.getElementById("artist").value = music.artista || "";
    document.getElementById("comment").value = music.comentario || "";
    document.getElementById("rating").value = music.nota ?? 10;
    document.getElementById("lyrics").value = music.letra || "";

    const formTitle = document.getElementById("form-title");
    const saveButton = document.getElementById("save-button");

    if (formTitle) formTitle.textContent = "Editar música";
    if (saveButton) saveButton.textContent = "Salvar alterações";
    if (cancelEditButton) cancelEditButton.hidden = false;

    musicMessage.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // EXCLUIR MÚSICA
  async function removeMusic(id) {
    if (!confirm("Deseja excluir esta música do catálogo compartilhado?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "musicas", id));
      musicMessage.textContent = "Música excluída!";
    } catch (error) {
      console.error("Erro ao excluir música:", error);
      musicMessage.textContent =
        "Não foi possível excluir. Confira as regras do Firestore.";
    }
  }

  // LIMPAR FORMULÁRIO
  function resetForm() {
    musicForm.reset();
    editingId = null;

    const formTitle = document.getElementById("form-title");
    const saveButton = document.getElementById("save-button");

    document.getElementById("rating").value = 10;

    if (formTitle) formTitle.textContent = "Adicionar música";
    if (saveButton) saveButton.textContent = "Adicionar música";
    if (cancelEditButton) cancelEditButton.hidden = true;
  }

  cancelEditButton?.addEventListener("click", resetForm);

  // PESQUISAR NO CATÁLOGO
  document.getElementById("filter")?.addEventListener("input", renderMusics);

  // PESQUISAR LETRAS NA API LYRICS.OVH
  document.getElementById("lyrics-form")?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const artist = document
        .getElementById("lyrics-artist")
        .value.trim();

      const title = document
        .getElementById("lyrics-title")
        .value.trim();

      if (!artist || !title) {
        lyricsMessage.textContent = "Informe o artista e o título.";
        return;
      }

      lyricsMessage.textContent = "Pesquisando letra...";
      lyricsResult.textContent = "";
      if (saveLyricsButton) saveLyricsButton.hidden = true;
      foundLyrics = "";

      try {
        const url =
          `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.lyrics) {
          throw new Error("Letra não encontrada.");
        }

        foundLyrics = data.lyrics;
        lyricsResult.textContent = foundLyrics;
        lyricsMessage.textContent = "Letra encontrada!";

        if (saveLyricsButton) saveLyricsButton.hidden = false;
      } catch (error) {
        console.error("Erro ao consultar a API:", error);

        lyricsMessage.textContent =
          error.message === "Letra não encontrada."
            ? error.message
            : "Erro ao consultar a API. Tente novamente.";
      }
    }
  );

  // USAR A LETRA ENCONTRADA NO CADASTRO
  saveLyricsButton?.addEventListener("click", () => {
    if (!foundLyrics) return;

    document.getElementById("title").value =
      document.getElementById("lyrics-title").value.trim();

    document.getElementById("artist").value =
      document.getElementById("lyrics-artist").value.trim();

    document.getElementById("lyrics").value = foundLyrics;

    editingId = null;

    const formTitle = document.getElementById("form-title");
    const saveButton = document.getElementById("save-button");

    if (formTitle) formTitle.textContent = "Adicionar música";
    if (saveButton) saveButton.textContent = "Adicionar música";
    if (cancelEditButton) cancelEditButton.hidden = true;

    musicMessage.textContent =
      "Letra preenchida! Confira os dados e clique em Adicionar música.";

    document.getElementById("title").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
