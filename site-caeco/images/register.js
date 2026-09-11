export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { prenom, nom, email, telephone, password } = req.body;
    // 👉 Ici tu ajoutes la logique pour sauvegarder dans ta DB
    res.status(200).json({ message: "Compte créé avec succès !" });
  } else {
    res.status(405).json({ message: "Méthode non autorisée" });
  }
}
