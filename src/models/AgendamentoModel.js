const schedule = require("node-schedule");
const Paciente = require("./PacienteModel");
const { Timestamp } = require("firebase-admin/firestore");

exports.agendaMedicamento = async function agendaMedicamento(
  pacienteId,
  dadosMedicamento
) {
  // dtProxLembrete,
  // duracao,
  // duracaoT,
  // frequencia,
  // frequenciaT,
  // dtInicio

  let {
    medicamentoId,
    dataInicio,
    duracao,
    duracaoT,
    frequencia,
    frequenciaT,
    alarme,
    nome,
    dosagem,
    via,
    medida,
  } = dadosMedicamento;
  console.log(dadosMedicamento);

  dataInicio = dataInicio.toDate(); //convertendo para Date javascript

  const dtProxLembrete = incrementaTempo(dataInicio, frequencia, frequenciaT);
  const dataFinal = incrementaTempo(dataInicio, duracao, duracaoT);

  await Paciente.configuraData(
    //incluindo datas calculadas no banco
    pacienteId,
    medicamentoId,
    dtProxLembrete,
    dataFinal
  );

  const dadosAgendamento = {
    pacienteId: pacienteId,
    medicamentoId: medicamentoId,
    dtProxLembrete: dtProxLembrete,
    frequencia: frequencia,
    frequenciaT: frequenciaT,
    dataFinal: dataFinal,
    alarme: alarme,
    nome: nome,
    dosagem: dosagem,
    via: via,
    medida: medida,
  };

  await criaLembrete(dadosAgendamento); //rotina lembrete
};

async function criaLembrete(dadosAgendamento) {
  let {
    pacienteId,
    medicamentoId,
    dtProxLembrete,
    frequencia,
    frequenciaT,
    dataFinal,
    alarme,
    nome,
    dosagem,
    via,
    medida,
  } = dadosAgendamento;

  let dataAlarme = new Date(dtProxLembrete);
  dataAlarme = dataAlarme.setMinutes(dataAlarme.getMinutes() - alarme);

  const nomePaci = await Paciente.getNomePaciente(pacienteId); //pegando nome do paciente
  const user = await Paciente.getCreatedPaci(pacienteId); //pegando o id do usuário que criou o paciente
  const fcmTokens = await Paciente.getFcmTokens(user); //pegando os tokens desse usuário

  //emite notificação em alguns minutos antes
  const alarmeAntes = schedule.scheduleJob(
    //id do agendando é o id do medicamento com um traço e o 2
    `${medicamentoId}-2`,
    dataAlarme,
    async () => {
      const horaFormatada = `${dtProxLembrete.getHours()}:${dtProxLembrete.getMinutes()}`;
      //envia uma notificação pra cada token
      fcmTokens.forEach((token) => {
        notificacao(token, horaFormatada, nome, dosagem, via, medida, nomePaci);
      });
    }
  );

  //
  const scheduleLembrete = schedule.scheduleJob(
    medicamentoId,
    dtProxLembrete,
    async function (dataAtual) {
      await Paciente.registraNotificao(pacienteId, medicamentoId, nome); //registra notificação no BD

      const horaFormatada = `${dtProxLembrete.getHours()}:${dtProxLembrete.getMinutes()}`;
      //envia uma notificação pra cada token
      fcmTokens.forEach((token) => {
        notificacao(token, horaFormatada, nome, dosagem, via, medida, nomePaci);
      });
      if (dataAtual < dataFinal) {
        dtProxLembrete = incrementaTempo(
          dtProxLembrete,
          frequencia,
          frequenciaT
        );

        if (dtProxLembrete > dataFinal) {
          dtProxLembrete = dataFinal;
        }

        const dadosAgendamento = {
          pacienteId,
          medicamentoId,
          dtProxLembrete,
          frequencia,
          frequenciaT,
          dataFinal,
          alarme,
          nome,
          dosagem,
          via,
          medida,
        };

        //atualiza data do próximo lembrete
        await Paciente.atualizaData(pacienteId, medicamentoId, dtProxLembrete);
        await criaLembrete(dadosAgendamento); //recria lembrete

        return;
      }
      const scheduleAntes = schedule.scheduledJobs[`${medicamentoId}-2`] //pegando agendamento na lista de agendamentos
      scheduleAntes.cancel();
      scheduleLembrete.cancel(); //se chegar a data final, cancela o agendamento
    }
  );
}

function notificacao(tokenUsu, hora, nomeRem, dosagem, via, medida, nomePaci) {
  fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization:
        "key=AAAAD7JhUmU:APA91bFZRwbfLYjHl_Mtmw5fZFC15ZXae6zMqX8ga0ms3MAxEZx7Dc5jQvp5k9n87A-t7saZaeNOefKLLxbvsrsEK_E83F7Wd6Rdhq2J6DDceVW8DHXkmJLHwb2Y3xtNATgMsLG6Xhvr",
      "Content-Type": "Application/json",
    },
    body: JSON.stringify({
      to: tokenUsu,
      notification: {
        priority: "high",
        title: `Medicamento às ${hora}`,
        body: `${nomeRem} ${dosagem} ${medida} ${via}\nPaciente: ${nomePaci}`,
      },
    }),
  }).then(() => {
    console.log("Notificação enviada");
  });
}

function incrementaTempo(dataInicial, tempo, tempoTipo) {
  //funções para adicionar tempo em uma data
  Date.prototype.addHoras = function (horas) {
    this.setHours(this.getHours() + horas);
  };
  Date.prototype.addMinutos = function (minutos) {
    this.setMinutes(this.getMinutes() + minutos);
  };
  Date.prototype.addSegundos = function (segundos) {
    this.setSeconds(this.getSeconds() + segundos);
  };
  Date.prototype.addDias = function (dias) {
    this.setDate(this.getDate() + dias);
  };
  Date.prototype.addMeses = function (meses) {
    this.setMonth(this.getMonth() + meses);
  };
  Date.prototype.addAnos = function (anos) {
    this.setYear(this.getFullYear() + anos);
  };

  //copiando data inicial para modifica-lá
  let dataFinal = new Date(dataInicial);

  //garantindo que tempo é number e tempotipo é string
  tempo = Number(tempo);
  tempoTipo = tempoTipo + "";

  //adiciona tempo baseada no tipo
  switch (tempoTipo) {
    case "segundo(s)":
      dataFinal.addSegundos(tempo);
      return dataFinal;
      break;
    case "minuto(s)":
      dataFinal.addMinutos(tempo);
      return dataFinal;
      break;
    case "hora(s)":
      dataFinal.addHoras(tempo);
      return dataFinal;
      break;
    case "dia(s)":
      dataFinal.addDias(tempo);
      return dataFinal;
      break;
    case "semana(s)":
      const semanasEmDias = tempo * 7;
      dataFinal.addDias(semanasEmDias);
      return dataFinal;
    case "mes(es)":
      dataFinal.addMeses(tempo);
      return dataFinal;
  }
}
