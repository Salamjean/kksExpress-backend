const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuration du transporteur email avec vos paramètres Hostinger
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: true, // true pour le port 465 (SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  debug: true, // Active le debug
  logger: true  // Log les activités
});

/**
 * Génère un token de réinitialisation de mot de passe
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Envoie un email d'activation de compte avec lien pour définir le mot de passe
 */
const sendActivationEmail = async (email, nom, prenom, resetToken) => {
  try {
    console.log('🔄 Tentative d\'envoi d\'email d\'activation à:', email);

    // Générer l'URL de réinitialisation (à adapter selon votre frontend)
    const resetUrl = `${process.env.FRONTEND_URL}/definir-mot-de-passe?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // En production, vous stockeriez le token dans la base de données avec une date d'expiration
    // await storeResetToken(email, resetToken);

    const mailOptions = {
      from: `"KKS-Express" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Activez votre compte KKS-Express',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #ddd; }
            .header { background: linear-gradient(135deg, #2663EB 0%, #1e4fcf 100%); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; background: #2663EB; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f1f1f1; color: #666; font-size: 12px; }
            .info-box { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2663EB; }
            .warning-box { background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeaa7; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🚚 KKS-Express</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Votre partenaire de livraison de confiance</p>
            </div>
            
            <div class="content">
              <h2 style="color: #2663EB; margin-top: 0;">Bonjour ${prenom} ${nom},</h2>
              
              <p>Votre compte livreur a été créé avec succès sur la plateforme <strong>KKS-Express</strong>.</p>
              
              <div class="info-box">
                <h3 style="color: #2663EB; margin-top: 0;">🎉 Bienvenue dans notre équipe !</h3>
                <p><strong>Votre email de connexion :</strong> ${email}</p>
                <p>Pour finaliser votre inscription, vous devez définir votre mot de passe personnel.</p>
              </div>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button" style="color: white; text-decoration: none;">
                  🔐 Définir mon mot de passe
                </a>
              </div>

              <div class="warning-box">
                <p style="margin: 0; color: #856404; font-weight: bold;">
                  ⚠️ Ce lien est valable pendant 24 heures. Si vous ne définissez pas votre mot de passe dans ce délai, 
                  vous devrez demander un nouveau lien.
                </p>
              </div>

              <p style="color: #666; font-size: 14px;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                <a href="${resetUrl}" style="color: #2663EB; word-break: break-all;">${resetUrl}</a>
              </p>

              <p>Cordialement,<br><strong>L'équipe KKS-Express</strong></p>
            </div>
            
            <div class="footer">
              <p>© 2024 KKS-Express. Tous droits réservés.</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('🔧 Test de connexion SMTP...');
    await transporter.verify();
    console.log('✅ Serveur SMTP configuré avec succès');

    console.log('📤 Envoi de l\'email d\'activation...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email d\'activation envoyé avec succès');
    console.log('📧 Message ID:', info.messageId);

    return resetToken; // Retourne le token pour stockage en base

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email d\'activation:');
    console.error('- Message:', error.message);

    if (error.response) {
      console.error('- Response:', error.response);
    }

    throw error;
  }
};

/**
 * Envoie un email avec un code OTP de 4 chiffres
 */
const sendOTPCodeEmail = async (email, nom, prenom, otpCode) => {
  try {
    console.log('📧 Envoi code OTP à:', email);
    console.log('🔢 Code OTP:', otpCode);

    const mailOptions = {
      from: `"KKS-Express" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔐 Votre code de vérification - KKS-Express',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #ddd; }
            .header { background: linear-gradient(135deg, #2663EB 0%, #1e4fcf 100%); color: white; padding: 30px 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .otp-code { 
              font-size: 42px; 
              font-weight: bold; 
              letter-spacing: 15px; 
              text-align: center; 
              background: #f8f9fa; 
              padding: 25px; 
              border-radius: 12px; 
              margin: 30px 0; 
              border: 3px solid #2663EB;
              color: #2663EB;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f1f1f1; color: #666; font-size: 12px; }
            .warning-box { background: #fff3cd; padding: 15px; border-radius: 8px; border: 2px solid #ffeaa7; margin: 20px 0; }
            .info-box { background: #e8f4fd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 5px solid #2663EB; }
            .steps { margin: 25px 0; }
            .step { margin-bottom: 15px; padding-left: 25px; position: relative; }
            .step-number { 
              position: absolute; 
              left: 0; 
              top: 0;
              background: #2663EB; 
              color: white; 
              width: 22px; 
              height: 22px; 
              border-radius: 50%; 
              text-align: center; 
              line-height: 22px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🔐 KKS-Express</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Réinitialisation de mot de passe</p>
            </div>
            
            <div class="content">
              <h2 style="color: #2663EB; margin-top: 0;">Bonjour ${prenom} ${nom},</h2>
              
              <div class="info-box">
                <h3 style="color: #2663EB; margin-top: 0;">Votre code de sécurité</h3>
                <p>Utilisez le code suivant pour réinitialiser votre mot de passe :</p>
              </div>

              <div class="otp-code">
                ${otpCode}
              </div>

              <div class="steps">
                <h4 style="color: #2663EB;">Procédure :</h4>
                <div class="step">
                  <span class="step-number">1</span>
                  <strong>Copiez le code ci-dessus</strong>
                </div>
                <div class="step">
                  <span class="step-number">2</span>
                  <strong>Retournez sur l'application KKS-Express</strong>
                </div>
                <div class="step">
                  <span class="step-number">3</span>
                  <strong>Collez ou saisissez le code dans le champ prévu</strong>
                </div>
                <div class="step">
                  <span class="step-number">4</span>
                  <strong>Choisissez votre nouveau mot de passe</strong>
                </div>
              </div>

              <div class="warning-box">
                <p style="margin: 0; color: #856404; font-weight: bold; font-size: 14px;">
                  ⚠️ <strong>IMPORTANT :</strong><br>
                  • Ce code est valable <strong>10 minutes</strong> seulement<br>
                  • <strong>Ne partagez jamais</strong> ce code avec qui que ce soit<br>
                  • Si vous n'avez pas fait cette demande, <strong>ignorez cet email</strong>
                </p>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                Si vous rencontrez des problèmes, contactez notre support :<br>
                📞 <strong>Support technique :</strong> ${process.env.SUPPORT_PHONE || '01 23 45 67 89'}<br>
                📧 <strong>Email :</strong> ${process.env.SUPPORT_EMAIL || 'support@kks-express.com'}
              </p>

              <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe KKS-Express</strong></p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} KKS-Express. Tous droits réservés.</p>
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        CODE DE VÉRIFICATION - KKS-EXPRESS
        ==================================
        
        Bonjour ${prenom} ${nom},
        
        Vous avez demandé la réinitialisation de votre mot de passe.
        
        VOTRE CODE DE VÉRIFICATION : ${otpCode}
        
        Procédure :
        1. Copiez le code ci-dessus
        2. Retournez sur l'application KKS-Express
        3. Collez ou saisissez le code dans le champ prévu
        4. Choisissez votre nouveau mot de passe
        
        ⚠️ IMPORTANT :
        • Ce code est valable 10 minutes seulement
        • Ne partagez jamais ce code avec qui que ce soit
        • Si vous n'avez pas fait cette demande, ignorez cet email
        
        Support technique :
        📞 Téléphone : ${process.env.SUPPORT_PHONE || '01 23 45 67 89'}
        📧 Email : ${process.env.SUPPORT_EMAIL || 'support@kks-express.com'}
        
        Cordialement,
        L'équipe KKS-Express
      `
    };

    await transporter.verify();
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email OTP envoyé avec succès');

    return true;

  } catch (error) {
    console.error('❌ Erreur envoi email OTP:', error.message);
    throw error;
  }
};

// Ajoutez la fonction sendWelcomeEmail adaptée à VOTRE configuration
const sendWelcomeEmail = async (userEmail, nom, prenom) => {
  try {
    console.log(`📧 Envoi email de bienvenue à: ${userEmail}`);

    // UTILISEZ VOS VARIABLES .env
    const fromEmail = process.env.MAIL_FROM_ADDRESS || 'contact@edemarchee-ci.com';
    const fromName = process.env.SMTP_FROM || 'KKS Express';

    console.log(`📤 Expéditeur: ${fromName} <${fromEmail}>`);
    console.log(`📥 Destinataire: ${userEmail}`);

    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail  // CORRECT: contact@edemarchee-ci.com
      },
      to: userEmail,
      subject: '🎉 Bienvenue sur KKS Express - Votre compte a été créé avec succès !',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0;">KKS Express</h1>
              <p style="margin: 10px 0 0;">Votre compte a été créé avec succès</p>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
              <h2 style="color: #4CAF50;">Bonjour ${prenom} ${nom},</h2>
              
              <p>Nous sommes ravis de vous accueillir sur <strong>KKS Express</strong> !</p>
              
              <p>Votre compte a été créé avec succès avec les informations suivantes :</p>
              
              <div style="background-color: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                <p><strong>Email :</strong> ${userEmail}</p>
                <p><strong>Date d'inscription :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              
              <p>Vous pouvez dès à présent :</p>
              <ul>
                <li>Accéder à votre tableau de bord</li>
                <li>Utiliser nos services</li>
                <li>Gérer votre profil</li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #666;">
                <strong>Conseil de sécurité :</strong> Ne partagez jamais votre mot de passe.
              </p>
              
              <p style="font-size: 14px; color: #666;">
                Si vous n'êtes pas à l'origine de cette inscription, veuillez ignorer cet email.
              </p>
              
              <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
                © ${new Date().getFullYear()} KKS Express. Tous droits réservés.<br>
                Cet email vous a été envoyé automatiquement.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bienvenue sur KKS Express !
        
        Bonjour ${prenom} ${nom},
        
        Votre compte KKS Express a été créé avec succès.
        
        Email : ${userEmail}
        Date d'inscription : ${new Date().toLocaleDateString('fr-FR')}
        
        Pour vous connecter : ${process.env.FRONTEND_URL || 'https://votre-app.com'}/login
        
        Conseils de sécurité :
        - Ne partagez jamais votre mot de passe
        - Utilisez un mot de passe unique
        
        Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.
        
        © ${new Date().getFullYear()} KKS Express
      `
    };

    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email envoyé ! Message ID: ${info.messageId}`);
    return true;

  } catch (error) {
    console.error(`💥 Erreur envoi email:`, error.message);
    throw error;
  }
};

// Ajoutez la fonction sendOrderStatusEmail pour les notifications de commande
const sendOrderStatusEmail = async (userEmail, nom, prenom, commande) => {
  try {
    console.log(`📧 Envoi notification statut commande à: ${userEmail}`);

    const fromEmail = process.env.MAIL_FROM_ADDRESS || 'contact@edemarchee-ci.com';
    const fromName = process.env.SMTP_FROM || 'KKS Express';

    let subject = '';
    let messageTitle = '';
    let messageBody = '';
    let color = '#2663EB'; // Bleu par défaut

    // Personnaliser le message selon le statut
    switch (commande.statut) {
       case 'acceptee':
        subject = `✅ Commande ${commande.reference} acceptée`;
        messageTitle = 'Livreur en route pour récupérer votre colis';
        messageBody = `
          <p>Bonne nouvelle ! Un livreur a accepté votre commande <strong>${commande.reference}</strong>.</p>
          <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Livreur :</strong> ${commande.livreur_prenom} ${commande.livreur_nom}</p>
            <p><strong>Téléphone :</strong> ${commande.livreur_telephone}</p>
          </div>
          <p>Le livreur va se rendre à l'adresse de récupération pour prendre en charge votre colis.</p>
        `;
        color = '#17a2b8'; // Cyan
        break;

      case 'recuperee':
        subject = `📦 Colis récupéré - ${commande.reference}`;
        messageTitle = 'Votre colis a été récupéré';
        messageBody = `
          <p>Le livreur a récupéré votre colis <strong>${commande.reference}</strong>.</p>
          <p>Il démarrera la livraison vers le destinataire dès que possible.</p>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>📍 Important :</strong> Vous recevrez une notification lorsque le livreur sera en route vers le destinataire.</p>
          </div>
        `;
        color = '#6c757d'; // Gris
        break;
        
      case 'en_cours':
        subject = `🚚 Votre commande ${commande.reference} est en route !`;
        messageTitle = 'Votre commande est en route';
        messageBody = `
          <p>Bonne nouvelle ! Votre commande <strong>${commande.reference}</strong> a été prise en charge par notre livreur.</p>
          <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Livreur :</strong> ${commande.livreur_prenom} ${commande.livreur_nom}</p>
            <p><strong>Téléphone :</strong> ${commande.livreur_telephone}</p>
          </div>
          <p>Vous pouvez suivre votre livraison en temps réel sur notre application.</p>
        `;
        color = '#2663EB'; // Bleu
        break;

      case 'livree':
        subject = `✅ Votre commande ${commande.reference} a été livrée !`;
        messageTitle = 'Commande livrée avec succès';
        messageBody = `
          <p>Votre commande <strong>${commande.reference}</strong> est bien arrivée à destination.</p>
          <p>Merci de votre confiance !</p>
          <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p><strong>Date de livraison :</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <p><strong>Lieu :</strong> ${commande.destinataire_adresse}</p>
          </div>
        `;
        color = '#28a745'; // Vert
        break;

      case 'annulee':
        subject = `❌ Votre commande ${commande.reference} a été annulée`;
        messageTitle = 'Commande annulée';
        messageBody = `
          <p>Votre commande <strong>${commande.reference}</strong> a été annulée.</p>
          <p>Si vous n'êtes pas à l'origine de cette annulation, veuillez nous contacter rapidement.</p>
        `;
        color = '#dc3545'; // Rouge
        break;

      default:
        return; // Ne rien envoyer pour les autres statuts
    }

    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: userEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: ${color}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0;">KKS Express</h1>
              <p style="margin: 10px 0 0;">${messageTitle}</p>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
              <h2 style="color: ${color};">Bonjour ${prenom} ${nom},</h2>
              
              ${messageBody}
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL}/commandes/${commande.id}" style="background-color: ${color}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Voir ma commande
                </a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                © ${new Date().getFullYear()} KKS Express. Tous droits réservés.<br>
                Cet email vous a été envoyé automatiquement.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Notification envoyée ! Message ID: ${info.messageId}`);
    return true;

  } catch (error) {
    console.error(`💥 Erreur envoi notification:`, error.message);
    // On ne bloque pas le flux si l'email échoue, on log juste l'erreur
    return false;
  }
};

// Envoyer le code de confirmation de livraison au client
const sendDeliveryCodeEmail = async (userEmail, nom, prenom, commande) => {
  try {
    console.log(`📧 Envoi code de livraison à: ${userEmail}`);
    
    const fromEmail = process.env.MAIL_FROM_ADDRESS || 'contact@edemarchee-ci.com';
    const fromName = process.env.SMTP_FROM || 'KKS Express';
    
    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: userEmail,
      subject: `🔐 Code de livraison - Commande ${commande.reference}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #2663EB; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
              <h1 style="margin: 0;">KKS Express</h1>
              <p style="margin: 10px 0 0;">Code de confirmation de livraison</p>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
              <h2 style="color: #2663EB;">Bonjour ${prenom} ${nom},</h2>
              
              <p>Votre commande <strong>${commande.reference}</strong> a été créée avec succès.</p>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                <h3 style="color: #856404; margin-top: 0;">⚠️ Important - Code de livraison</h3>
                <p style="margin: 10px 0;">Voici votre <strong>code de confirmation</strong> à communiquer au livreur lors de la remise de votre colis :</p>
                <div style="text-align: center; font-size: 48px; font-weight: bold; letter-spacing: 10px; color: #2663EB; background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 3px solid #2663EB;">
                  ${commande.code_confirmation}
                </div>
                <p style="margin: 10px 0; color: #856404;"><strong>Ne partagez ce code qu'avec le livreur au moment de la livraison.</strong></p>
              </div>
              
              <div style="background-color: white; padding: 15px; border-left: 4px solid #2663EB; margin: 20px 0;">
                <p><strong>Référence de commande :</strong> ${commande.reference}</p>
                <p><strong>Destination :</strong> ${commande.destinataire_adresse}</p>
                <p><strong>Type de colis :</strong> ${commande.type_colis}</p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                Vous recevrez une notification lorsqu'un livreur acceptera votre commande.
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #999; text-align: center;">
                © ${new Date().getFullYear()} KKS Express. Tous droits réservés.<br>
                Cet email vous a été envoyé automatiquement.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Code de livraison envoyé ! Message ID: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.error(`💥 Erreur envoi code livraison:`, error.message);
    return false;
  }
};
module.exports = {
  sendActivationEmail,
  sendWelcomeEmail,
  generateResetToken,
  sendOTPCodeEmail,
  sendOrderStatusEmail,
  sendDeliveryCodeEmail
};