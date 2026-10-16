
/* =========================================
   CLÍNICA DR. JÚLIO CÉSAR
   PAINEL ADMINISTRATIVO
   FIREBASE AUTHENTICATION + FIRESTORE
========================================= */

/* =========================================
   IMPORTAÇÕES FIREBASE
========================================= */

import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    getDocs,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


/* =========================================
   CONFIGURAÇÃO FIREBASE
========================================= */

const firebaseConfig = {
    apiKey: "AIzaSyD2-3jBE9DtNZUs7hFRbqdfIu1sufv2chY",
    authDomain: "clinica-julio-cesar.firebaseapp.com",
    projectId: "clinica-julio-cesar",
    storageBucket: "clinica-julio-cesar.firebasestorage.app",
    messagingSenderId: "855949688593",
    appId: "1:855949688593:web:8d7076e135bacab97896b0",
    measurementId: "G-WXQW2ZFVV8"
};

const ADMIN_UID =
    "haK43ZKHBDV3nxPUkUM32dCW0l13";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================
   ELEMENTOS DO HTML
========================================= */

const formularioLogin =
    document.getElementById("form-login");

const botaoEntrar =
    document.getElementById("btn-entrar");

const mensagemLogin =
    document.getElementById("mensagem-login");

const conteudoAdmin =
    document.getElementById("conteudo-admin");

const carregando =
    document.getElementById("carregando");

const botaoSair =
    document.getElementById("btn-sair");

const emailAdmin =
    document.getElementById("email-admin");

const statusAdmin =
    document.getElementById("status-admin");

const tabelaAgendamentos =
    document.getElementById("tabela-agendamentos");

const mensagemAdmin =
    document.getElementById("mensagem-admin");

const filtroData =
    document.getElementById("filtro-data");

const filtroStatus =
    document.getElementById("filtro-status");

const botaoAtualizar =
    document.getElementById("btn-atualizar");

const totalAgendamentos =
    document.getElementById("total-agendamentos");

const totalPendentes =
    document.getElementById("total-pendentes");

const totalConfirmados =
    document.getElementById("total-confirmados");

const totalCancelados =
    document.getElementById("total-cancelados");


/* =========================================
   ESTADO DO SISTEMA
========================================= */

let agendamentos = [];
let carregandoAgendamentos = false;
let executandoAcao = false;
let sessaoAtual = 0;


/* =========================================
   AUTORIZAÇÃO ADMINISTRATIVA
========================================= */

function usuarioAdministrador(usuario) {

    return Boolean(
        usuario &&
        usuario.uid === ADMIN_UID
    );

}


/* =========================================
   TRADUZIR ERROS DE LOGIN
========================================= */

function traduzirErro(codigo) {

    switch (codigo) {

        case "auth/invalid-email":
            return "Digite um e-mail válido.";

        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
            return "E-mail ou senha incorretos.";

        case "auth/too-many-requests":
            return "Muitas tentativas. Tente novamente mais tarde.";

        case "auth/network-request-failed":
            return "Verifique sua conexão com a internet.";

        case "auth/operation-not-allowed":
            return "Login por e-mail e senha não está habilitado.";

        case "auth/unauthorized-domain":
            return "Domínio não autorizado no Firebase.";

        default:
            return "Não foi possível realizar a operação.";

    }

}


/* =========================================
   MENSAGENS DO PAINEL
========================================= */

function mostrarMensagem(texto, erro = false) {

    if (!mensagemAdmin) return;

    mensagemAdmin.textContent = texto;

    mensagemAdmin.style.color =
        erro ? "#b42318" : "#087c99";

}


/* =========================================
   FORMATAÇÃO
========================================= */

function formatarData(data) {

    const partes = data.split("-");

    if (partes.length !== 3) {
        return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


function nomeStatus(status) {

    const nomes = {
        pendente: "Pendente",
        confirmado: "Confirmado",
        cancelado: "Cancelado"
    };

    return nomes[status] || status;

}


/* =========================================
   ATUALIZAR INDICADORES
========================================= */

function atualizarIndicadores() {

    if (!totalAgendamentos) return;

    totalAgendamentos.textContent =
        agendamentos.length;

    totalPendentes.textContent =
        agendamentos.filter(
            item => item.status === "pendente"
        ).length;

    totalConfirmados.textContent =
        agendamentos.filter(
            item => item.status === "confirmado"
        ).length;

    // Nesta versão, cancelamentos excluem
    // a reserva e não ficam no histórico.

    totalCancelados.textContent = "0";

}


/* =========================================
   CONTROLE DOS BOTÕES
========================================= */

function bloquearBotoes(bloquear) {

    if (botaoAtualizar) {
        botaoAtualizar.disabled = bloquear;
    }

    if (tabelaAgendamentos) {

        tabelaAgendamentos
            .querySelectorAll("button")
            .forEach(botao => {

                botao.disabled = bloquear;

            });

    }

}


/* =========================================
   MONTAR TABELA
========================================= */

function mostrarTabela() {

    if (!tabelaAgendamentos) return;

    tabelaAgendamentos.replaceChildren();

    const dataSelecionada =
        filtroData?.value || "";

    const statusSelecionado =
        filtroStatus?.value || "todos";

    const filtrados = agendamentos.filter(item => {

        const correspondeData =
            !dataSelecionada ||
            item.data === dataSelecionada;

        const correspondeStatus =
            statusSelecionado === "todos" ||
            item.status === statusSelecionado;

        return correspondeData && correspondeStatus;

    });

    if (filtrados.length === 0) {

        const linha = document.createElement("tr");

        const celula = document.createElement("td");

        celula.colSpan = 4;
        celula.className = "mensagem-tabela";

        celula.textContent =
            "Nenhum agendamento encontrado.";

        linha.appendChild(celula);

        tabelaAgendamentos.appendChild(linha);

        return;

    }

    filtrados.forEach(item => {

        const linha = document.createElement("tr");

        /* DATA */

        const colunaData = document.createElement("td");

        colunaData.textContent =
            formatarData(item.data);

        /* HORÁRIO */

        const colunaHorario = document.createElement("td");

        colunaHorario.textContent =
            item.horario;

        /* SITUAÇÃO */

        const colunaStatus = document.createElement("td");

        const etiqueta = document.createElement("span");

        etiqueta.className =
            `status-agendamento status-${item.status}`;

        etiqueta.textContent =
            nomeStatus(item.status);

        colunaStatus.appendChild(etiqueta);

        /* AÇÕES */

        const colunaAcoes = document.createElement("td");

        const acoes = document.createElement("div");

        acoes.className = "acoes-tabela";

        /* BOTÃO CONFIRMAR */

        const confirmar = document.createElement("button");

        confirmar.type = "button";
        confirmar.className = "btn-confirmar";
        confirmar.textContent = "✓ Confirmar";

        confirmar.disabled =
            item.status === "confirmado" ||
            executandoAcao ||
            carregandoAgendamentos;

        confirmar.addEventListener("click", () => {

            confirmarConsulta(item);

        });

        /* BOTÃO CANCELAR */

        const cancelar = document.createElement("button");

        cancelar.type = "button";
        cancelar.className = "btn-cancelar";
        cancelar.textContent = "✕ Cancelar";

        cancelar.disabled =
            executandoAcao ||
            carregandoAgendamentos;

        cancelar.addEventListener("click", () => {

            cancelarConsulta(item);

        });

        acoes.append(confirmar, cancelar);

        colunaAcoes.appendChild(acoes);

        linha.append(
            colunaData,
            colunaHorario,
            colunaStatus,
            colunaAcoes
        );

        tabelaAgendamentos.appendChild(linha);

    });

}


/* =========================================
   CONSULTAR AGENDAMENTOS
========================================= */

async function carregarAgendamentos() {

    if (
        carregandoAgendamentos ||
        executandoAcao
    ) {
        return;
    }

    if (!usuarioAdministrador(auth.currentUser)) {

        mostrarMensagem(
            "Acesso administrativo não autorizado.",
            true
        );

        return;

    }

    const sessaoDaConsulta = sessaoAtual;

    carregandoAgendamentos = true;

    bloquearBotoes(true);

    mostrarMensagem("Consultando agendamentos...");

    try {

        const resultado = await getDocs(
            collection(db, "horarios_demo")
        );

        if (
            sessaoDaConsulta !== sessaoAtual ||
            !usuarioAdministrador(auth.currentUser)
        ) {
            return;
        }

        const encontrados = [];

        resultado.forEach(documento => {

            const id = documento.id;

            const correspondencia =
                /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})$/.exec(id);

            if (!correspondencia) return;

            const dados = documento.data();

            const statusValidos = [
                "pendente",
                "confirmado",
                "cancelado"
            ];

            const status = statusValidos.includes(
                dados.status
            )
                ? dados.status
                : "pendente";

            encontrados.push({

                id,

                data: correspondencia[1],

                horario:
                    `${correspondencia[2]}:${correspondencia[3]}`,

                status

            });

        });

        encontrados.sort((a, b) => {

            return (
                a.data.localeCompare(b.data) ||
                a.horario.localeCompare(b.horario)
            );

        });

        agendamentos = encontrados;

        atualizarIndicadores();

        mostrarMensagem(
            `${agendamentos.length} agendamento(s) encontrado(s).`
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar agendamentos:",
            erro
        );

        mostrarMensagem(
            "Não foi possível consultar o Firestore. Verifique sua conexão e as regras de acesso.",
            true
        );

    } finally {

        carregandoAgendamentos = false;

        if (sessaoDaConsulta === sessaoAtual) {

            mostrarTabela();

            bloquearBotoes(false);

        }

    }

}


/* =========================================
   CONFIRMAR CONSULTA
========================================= */

async function confirmarConsulta(item) {

    if (
        executandoAcao ||
        carregandoAgendamentos ||
        !usuarioAdministrador(auth.currentUser)
    ) {
        return;
    }

    if (item.status === "confirmado") {
        return;
    }

    executandoAcao = true;

    bloquearBotoes(true);

    mostrarMensagem(
        `Confirmando consulta de ${formatarData(item.data)} às ${item.horario}...`
    );

    let sucesso = false;

    try {

        const referencia = doc(
            db,
            "horarios_demo",
            item.id
        );

        await runTransaction(db, async (transacao) => {

            const registro =
                await transacao.get(referencia);

            if (!registro.exists()) {

                throw new Error("RESERVA_INEXISTENTE");

            }

            transacao.update(referencia, {
                status: "confirmado"
            });

        });

        sucesso = true;

    } catch (erro) {

        console.error(
            "Erro ao confirmar consulta:",
            erro
        );

        mostrarMensagem(
            erro.message === "RESERVA_INEXISTENTE"
                ? "Esta reserva não existe mais. Atualize a tabela."
                : "Não foi possível confirmar a consulta. Verifique as permissões do Firebase.",
            true
        );

    } finally {

        executandoAcao = false;

        bloquearBotoes(false);

    }

    if (sucesso) {

        await carregarAgendamentos();

        mostrarMensagem(
            "Consulta confirmada com sucesso! ✅"
        );

    }

}


/* =========================================
   CANCELAR CONSULTA
========================================= */

async function cancelarConsulta(item) {

    if (
        executandoAcao ||
        carregandoAgendamentos ||
        !usuarioAdministrador(auth.currentUser)
    ) {
        return;
    }

    const desejaCancelar = window.confirm(
        `Deseja realmente cancelar a consulta de ${formatarData(item.data)} às ${item.horario}?\n\nO horário ficará disponível para uma nova reserva.`
    );

    if (!desejaCancelar) {
        return;
    }

    executandoAcao = true;

    bloquearBotoes(true);

    mostrarMensagem(
        `Cancelando consulta de ${formatarData(item.data)} às ${item.horario}...`
    );

    let sucesso = false;

    try {

        const referencia = doc(
            db,
            "horarios_demo",
            item.id
        );

        await runTransaction(db, async (transacao) => {

            const registro =
                await transacao.get(referencia);

            if (!registro.exists()) {

                throw new Error("RESERVA_INEXISTENTE");

            }

            transacao.delete(referencia);

        });

        sucesso = true;

    } catch (erro) {

        console.error(
            "Erro ao cancelar consulta:",
            erro
        );

        mostrarMensagem(
            erro.message === "RESERVA_INEXISTENTE"
                ? "Esta reserva já foi removida. Atualize a tabela."
                : "Não foi possível cancelar a consulta. Verifique as permissões do Firebase.",
            true
        );

    } finally {

        executandoAcao = false;

        bloquearBotoes(false);

    }

    if (sucesso) {

        await carregarAgendamentos();

        mostrarMensagem(
            "Consulta cancelada e horário liberado! ✅"
        );

    }

}


/* =========================================
   LOGIN ADMINISTRATIVO
========================================= */

if (formularioLogin) {

    formularioLogin.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault();

            const email =
                document.getElementById("email").value.trim();

            const senha =
                document.getElementById("senha").value;

            botaoEntrar.disabled = true;

            botaoEntrar.textContent =
                "Verificando acesso...";

            mensagemLogin.textContent =
                "Conectando ao Firebase...";

            mensagemLogin.style.color = "#087c99";

            try {

                const credencial =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        senha
                    );

                if (!usuarioAdministrador(credencial.user)) {

                    await signOut(auth);

                    throw new Error("ACESSO_NEGADO");

                }

                mensagemLogin.textContent =
                    "Login realizado! Redirecionando...";

                mensagemLogin.style.color = "green";

                window.location.replace("admin.html");

            } catch (erro) {

                console.error(
                    "Erro no login:",
                    erro.code || erro.message
                );

                mensagemLogin.textContent =
                    erro.message === "ACESSO_NEGADO"
                        ? "Este usuário não possui acesso administrativo."
                        : traduzirErro(erro.code);

                mensagemLogin.style.color = "#b42318";

            } finally {

                botaoEntrar.disabled = false;

                botaoEntrar.textContent =
                    "🔐 Entrar no painel";

            }

        }
    );

}


/* =========================================
   VERIFICAR SESSÃO ADMINISTRATIVA
========================================= */

if (conteudoAdmin) {

    onAuthStateChanged(
        auth,

        async (usuario) => {

            sessaoAtual++;

            if (!usuario) {

                conteudoAdmin.style.display = "none";

                window.location.replace("login.html");

                return;

            }

            if (!usuarioAdministrador(usuario)) {

                conteudoAdmin.style.display = "none";

                await signOut(auth);

                window.location.replace("login.html");

                return;

            }

            if (emailAdmin) {

                emailAdmin.textContent =
                    usuario.email || "Administrador";

            }

            if (statusAdmin) {

                statusAdmin.textContent =
                    "Sessão administrativa autenticada.";

            }

            if (carregando) {
                carregando.style.display = "none";
            }

            conteudoAdmin.style.display = "block";

            await carregarAgendamentos();

        },

        (erro) => {

            console.error(
                "Erro ao verificar autenticação:",
                erro
            );

            conteudoAdmin.style.display = "none";

            window.location.replace("login.html");

        }
    );

}


/* =========================================
   FILTROS E ATUALIZAÇÃO
========================================= */

filtroData?.addEventListener(
    "change",
    mostrarTabela
);

filtroStatus?.addEventListener(
    "change",
    mostrarTabela
);

botaoAtualizar?.addEventListener(
    "click",
    carregarAgendamentos
);


/* =========================================
   ENCERRAR SESSÃO
========================================= */

if (botaoSair) {

    botaoSair.addEventListener(
        "click",
        async () => {

            botaoSair.disabled = true;

            botaoSair.textContent = "Saindo...";

            try {

                await signOut(auth);

                window.location.replace("login.html");

            } catch (erro) {

                console.error(
                    "Erro ao sair:",
                    erro
                );

                alert(
                    "Não foi possível encerrar a sessão."
                );

                botaoSair.disabled = false;

                botaoSair.textContent =
                    "Sair da administração";

            }

        }
    );

}


/* =========================================
   INICIALIZAÇÃO
========================================= */

console.log(
    "Painel administrativo Firebase inicializado!"
);
