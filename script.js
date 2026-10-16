
/* =========================================
   CLÍNICA DR. JÚLIO CÉSAR
   AGENDAMENTO + FIREBASE + WHATSAPP
========================================= */

import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
    getFirestore,
    collection,
    doc,
    getDocs,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


/* =========================================
   CONFIGURAÇÃO DO FIREBASE
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase inicializado com sucesso!");
console.log("Firestore preparado:", db.app.name);


/* =========================================
   CONFIGURAÇÕES DA CLÍNICA
========================================= */

const numeroWhatsApp = "5562985928319";

const horariosAtendimento = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00"
];


/* =========================================
   ELEMENTOS DO HTML
========================================= */

const formulario =
    document.getElementById("form-agendamento");

const nomeInput =
    document.getElementById("nome");

const telefoneInput =
    document.getElementById("telefone");

const dataInput =
    document.getElementById("data");

const horarioInput =
    document.getElementById("horario");

const statusHorarios =
    document.getElementById("status-horarios");

const mensagemFormulario =
    document.getElementById("mensagem-formulario");

const botaoAgendar =
    document.getElementById("btn-agendar");

const linkWhatsApp =
    document.getElementById("link-whatsapp");

let horariosCarregados = false;
let enviando = false;
let consultaAtual = 0;


/* =========================================
   MENU RESPONSIVO CORRIGIDO
========================================= */

const menuToggle =
    document.querySelector(".menu-toggle");

const menuPrincipal =
    document.getElementById("menu-principal");

function fecharMenu() {

    if (!menuToggle || !menuPrincipal) return;

    menuToggle.setAttribute(
        "aria-expanded",
        "false"
    );

    menuToggle.setAttribute(
        "aria-label",
        "Abrir menu"
    );

    menuPrincipal.classList.remove(
        "ativo",
        "aberto",
        "menu-aberto"
    );

}

if (menuToggle && menuPrincipal) {

    menuToggle.addEventListener("click", () => {

        const aberto =
            menuToggle.getAttribute("aria-expanded") === "true";

        if (aberto) {

            fecharMenu();

        } else {

            menuToggle.setAttribute(
                "aria-expanded",
                "true"
            );

            menuToggle.setAttribute(
                "aria-label",
                "Fechar menu"
            );

            // Compatível com o CSS original e o corrigido.
            menuPrincipal.classList.add(
                "ativo",
                "aberto",
                "menu-aberto"
            );

        }

    });

    menuPrincipal.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            fecharMenu();

        });

    });

    document.addEventListener("keydown", evento => {

        if (evento.key === "Escape") {

            fecharMenu();

        }

    });

    document.addEventListener("click", evento => {

        if (
            !menuPrincipal.contains(evento.target) &&
            !menuToggle.contains(evento.target)
        ) {

            fecharMenu();

        }

    });

    window.addEventListener("resize", () => {

        if (window.innerWidth > 768) {

            fecharMenu();

        }

    });

}


/* =========================================
   FUNÇÕES DE DATA
========================================= */

function hojeLocal() {

    const agora = new Date();

    const ano = agora.getFullYear();

    const mes = String(
        agora.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        agora.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;

}

dataInput.min = hojeLocal();


function diaUtil(data) {

    const [ano, mes, dia] =
        data.split("-").map(Number);

    const semana = new Date(
        ano,
        mes - 1,
        dia
    ).getDay();

    return semana >= 1 && semana <= 5;

}


function horarioPassou(data, horario) {

    const [ano, mes, dia] =
        data.split("-").map(Number);

    const [hora, minuto] =
        horario.split(":").map(Number);

    const dataConsulta = new Date(
        ano,
        mes - 1,
        dia,
        hora,
        minuto
    );

    return dataConsulta.getTime() <= Date.now();

}


/* =========================================
   CONTROLE DO BOTÃO
========================================= */

function atualizarBotao() {

    botaoAgendar.disabled =
        !horariosCarregados ||
        enviando ||
        !horarioInput.value ||
        !formulario.checkValidity();

}


/* =========================================
   CONTROLE DO WHATSAPP
========================================= */

function ocultarWhatsApp() {

    if (!linkWhatsApp) return;

    linkWhatsApp.style.setProperty(
        "display",
        "none",
        "important"
    );

    linkWhatsApp.removeAttribute("href");

}


function prepararWhatsApp(nome, telefone, data, horario) {

    const [ano, mes, dia] = data.split("-");

    const mensagemWhatsApp =
`Olá! 🩺

Realizei uma reserva demonstrativa pelo site da Clínica Dr. Júlio César.

👤 Nome: ${nome}
📱 Telefone: ${telefone}
📅 Data: ${dia}/${mes}/${ano}
🕘 Horário: ${horario}

Este é um agendamento fictício de demonstração.`;

    const urlWhatsApp =
        `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagemWhatsApp)}`;

    if (linkWhatsApp) {

        linkWhatsApp.href = urlWhatsApp;

        linkWhatsApp.textContent =
            "📲 Confirmar agendamento pelo WhatsApp";

        linkWhatsApp.style.setProperty(
            "display",
            "flex",
            "important"
        );

    }

}


/* =========================================
   EXIBIR HORÁRIOS DISPONÍVEIS
========================================= */

function preencherHorarios(ocupados = new Set()) {

    horarioInput.replaceChildren(
        new Option("Selecione um horário", "")
    );

    let horariosLivres = 0;

    const data = dataInput.value;

    horariosAtendimento.forEach(horario => {

        const ocupado = ocupados.has(horario);

        const encerrado =
            horarioPassou(data, horario);

        let descricao = horario;

        if (ocupado) {

            descricao += " — Ocupado";

        } else if (encerrado) {

            descricao += " — Encerrado";

        }

        const opcao =
            new Option(descricao, horario);

        opcao.disabled =
            ocupado || encerrado;

        horarioInput.add(opcao);

        if (!opcao.disabled) {

            horariosLivres++;

        }

    });

    horarioInput.disabled =
        horariosLivres === 0;

    horariosCarregados = true;

    statusHorarios.textContent =
        horariosLivres > 0
            ? `${horariosLivres} horário(s) disponível(is) nesta data.`
            : "Nenhum horário disponível nesta data.";

    atualizarBotao();

}


/* =========================================
   CONSULTAR FIRESTORE
========================================= */

async function consultarHorarios() {

    const token = ++consultaAtual;

    const dataSelecionada = dataInput.value;

    horariosCarregados = false;

    horarioInput.disabled = true;

    horarioInput.replaceChildren(
        new Option("Carregando horários...", "")
    );

    atualizarBotao();

    if (!dataSelecionada) {

        statusHorarios.textContent =
            "Escolha uma data.";

        return;

    }

    if (
        dataSelecionada < hojeLocal() ||
        !diaUtil(dataSelecionada)
    ) {

        statusHorarios.textContent =
            "Selecione uma data válida de segunda a sexta-feira.";

        return;

    }

    statusHorarios.textContent =
        "Consultando horários disponíveis...";

    try {

        const registros = await getDocs(
            collection(db, "horarios_demo")
        );

        if (token !== consultaAtual) return;

        const horariosOcupados = new Set();

        registros.forEach(registro => {

            const id = registro.id;

            if (id.startsWith(`${dataSelecionada}_`)) {

                const horario = id
                    .slice(11)
                    .replace("-", ":");

                horariosOcupados.add(horario);

            }

        });

        preencherHorarios(horariosOcupados);

    } catch (erro) {

        if (token !== consultaAtual) return;

        console.error(
            "Erro ao consultar horários:",
            erro
        );

        statusHorarios.textContent =
            "Não foi possível consultar os horários. Verifique o Firebase.";

    }

}


/* =========================================
   EVENTOS DO FORMULÁRIO
========================================= */

dataInput.addEventListener("change", () => {

    mensagemFormulario.textContent = "";

    ocultarWhatsApp();

    consultarHorarios();

});

horarioInput.addEventListener(
    "change",
    atualizarBotao
);

formulario.addEventListener(
    "input",
    atualizarBotao
);


/* =========================================
   CONFIRMAR AGENDAMENTO
========================================= */

formulario.addEventListener(
    "submit",
    async (evento) => {

        evento.preventDefault();

        if (
            !horariosCarregados ||
            enviando ||
            !formulario.reportValidity() ||
            !horarioInput.value
        ) {

            return;

        }

        const nome = nomeInput.value.trim();

        const telefone =
            telefoneInput.value.trim();

        const data = dataInput.value;

        const horario = horarioInput.value;

        if (
            !nome ||
            !telefone ||
            data < hojeLocal() ||
            !diaUtil(data) ||
            !horariosAtendimento.includes(horario) ||
            horarioPassou(data, horario)
        ) {

            mensagemFormulario.textContent =
                "Confira os dados e escolha um horário válido.";

            await consultarHorarios();

            return;

        }

        enviando = true;

        atualizarBotao();

        ocultarWhatsApp();

        mensagemFormulario.textContent =
            "Reservando horário no Firebase...";

        const idReserva =
            `${data}_${horario.replace(":", "-")}`;

        try {

            const referencia = doc(
                db,
                "horarios_demo",
                idReserva
            );

            await runTransaction(
                db,
                async (transacao) => {

                    const reservaExistente =
                        await transacao.get(referencia);

                    if (reservaExistente.exists()) {

                        throw new Error(
                            "HORARIO_OCUPADO"
                        );

                    }

                    transacao.set(referencia, {
                        criadoEm: serverTimestamp()
                    });

                }
            );

            /* ============================
               RESERVA CONCLUÍDA
            ============================ */

            prepararWhatsApp(
                nome,
                telefone,
                data,
                horario
            );

            mensagemFormulario.textContent =
                "Reserva demonstrativa concluída! Clique no botão do WhatsApp para enviar sua confirmação.";

            horarioInput.value = "";

            /* ============================
               ATUALIZAR HORÁRIOS
               SEM BLOQUEAR O WHATSAPP
            ============================ */

            try {

                await consultarHorarios();

            } catch (erroAtualizacao) {

                console.warn(
                    "Falha ao atualizar horários:",
                    erroAtualizacao
                );

            }

        } catch (erro) {

            console.error(
                "Erro no agendamento:",
                erro
            );

            if (erro.message === "HORARIO_OCUPADO") {

                mensagemFormulario.textContent =
                    "Este horário acabou de ser reservado. Escolha outro.";

            } else {

                mensagemFormulario.textContent =
                    "Não foi possível reservar. Verifique a conexão e as regras do Firebase.";

            }

            await consultarHorarios();

        } finally {

            enviando = false;

            atualizarBotao();

        }

    }
);


/* =========================================
   INICIALIZAÇÃO
========================================= */

ocultarWhatsApp();

console.log(
    "Sistema de agendamentos preparado!"
);
