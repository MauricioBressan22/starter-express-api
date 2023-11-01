const {
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin/app");

const {
  getFirestore,
  Timestamp,
  FieldValue,
  Filter,
} = require("firebase-admin/firestore");

const serviceAccount = require("../../serviceAccount.json");
const { error } = require("console");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

class Paciente {
  static async getMedicamentos(pacienteId) {
    const medicamentosRef = db
      .collection("paciente")
      .doc(pacienteId)
      .collection("medicamento");

    const snapshotMedi = await medicamentosRef.get();

    const dadosMedicamentos = [];
    snapshotMedi.forEach((medicamento) => {
      dadosMedicamentos.push({
        medicamentoId: medicamento.id,
        ...medicamento.data(),
      });
    });

    return dadosMedicamentos;
  }

  static async getCreatedPaci(id) {
    const pacienteRef = await db.collection("paciente").doc(id);

    const paciente = await pacienteRef.get();

    let createdBy = paciente.data().created_by;
    createdBy = createdBy.slice(7);

    return createdBy;
  }

  static async getFcmTokens(id) {
    const usersRef = await db
      .collection("users")
      .doc(id)
      .collection("fcm_tokens");

    const snapshotFcm = await usersRef.get();

    const fcmTokens = [];
    snapshotFcm.forEach((fcmToken) => {
      fcmTokens.push(fcmToken.data().fcm_token);
    });

    return fcmTokens;
  }

  static async atualizaData(pacienteId, medicamentoId, data) {
    const medicamentoRef = db
      .collection("paciente")
      .doc(pacienteId)
      .collection("medicamento")
      .doc(medicamentoId);

    await medicamentoRef.update({
      data_ProxLembrete: Timestamp.fromDate(data),
    });
  }

  static async configuraData(
    pacienteId,
    medicamentoId,
    dataProxLembrete,
    dataFinal
  ) {
    const medicamentoRef = db
      .collection("paciente")
      .doc(pacienteId)
      .collection("medicamento")
      .doc(medicamentoId);

    await medicamentoRef.update({
      data_ProxLembrete: Timestamp.fromDate(dataProxLembrete),
      data_Final: Timestamp.fromDate(dataFinal),
    });
  }

  static async getNomePaciente(pacienteId) {
    const pacienteRef = db.collection("paciente").doc(pacienteId);

    const snapshotPaci = await pacienteRef.get();

    return snapshotPaci.data().nome;
  }

  static async registraNotificao(pacienteId, medicamentoId, nomeRem) {
    try {
      const pacienteRef = db.collection("paciente").doc(pacienteId);

      const snapshotPaci = await pacienteRef.get();
      const cuidador = snapshotPaci.data().cuidador;

      const dados = {
        cuidador: cuidador,
        medicamento: `/medicamento/${medicamentoId}`,
        nome: nomeRem,
        paciente: `/paciente/${pacienteId}`,
      };

      await db.collection("notificacao").add(dados);
    } catch (err) {
      throw new Error(error);
    }
  }
}

module.exports = Paciente;
