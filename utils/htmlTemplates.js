// utils/htmlTemplates.js

// Fonction pour générer la page de confirmation
exports.generateConfirmationPage = (transactionId, livreurId, status = 'pending', message = '') => {
  const backendUrl = process.env.APP_URL || "http://localhost:5000";
  const apiUrl = `${backendUrl}/api/paiements`;
  
  return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation Paiement - KKS Express</title>
    <style>
      ${getCSS()}
    </style>
  </head>
  <body>
    <div class="container">
      ${getHeaderHTML()}
      ${getStatusSectionHTML(status, message)}
      ${getInfoBoxHTML(transactionId, livreurId, status)}
      ${getActionsHTML()}
      ${getFooterHTML()}
    </div>
    
    <script>
      ${getJavaScript(transactionId, livreurId, status, message, apiUrl)}
    </script>
  </body>
  </html>
  `;
};

// CSS séparé
function getCSS() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      color: #333;
    }
    
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.2);
      padding: 40px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 5px;
      background: linear-gradient(to right, #667eea, #764ba2);
    }
    
    .logo {
      margin-bottom: 25px;
    }
    
    .logo h1 {
      color: #667eea;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    
    .logo p {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .status-icon {
      font-size: 60px;
      margin: 20px 0;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .success { color: #10B981; }
    .pending { color: #F59E0B; }
    .error { color: #EF4444; }
    
    .spinner {
      width: 60px;
      height: 60px;
      border: 6px solid #f3f3f3;
      border-top: 6px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    h2 {
      color: #374151;
      font-size: 22px;
      margin-bottom: 15px;
      font-weight: 600;
    }
    
    .message {
      color: #6B7280;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 25px;
      padding: 0 10px;
    }
    
    .info-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      margin: 25px 0;
      text-align: left;
    }
    
    .info-item {
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
    }
    
    .info-label {
      color: #6B7280;
      font-weight: 500;
      font-size: 14px;
    }
    
    .info-value {
      color: #111827;
      font-weight: 600;
      font-size: 14px;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .actions {
      margin-top: 30px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .btn {
      padding: 15px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .btn-primary {
      background: linear-gradient(to right, #667eea, #764ba2);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    
    .btn-secondary {
      background: #F3F4F6;
      color: #374151;
    }
    
    .btn-secondary:hover {
      background: #E5E7EB;
    }
    
    .btn-icon {
      width: 20px;
      height: 20px;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      font-size: 12px;
      color: #9CA3AF;
    }
    
    .hidden {
      display: none;
    }
    
    .alert {
      padding: 15px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    
    .alert-success {
      background: #D1FAE5;
      color: #065F46;
      border: 1px solid #A7F3D0;
    }
    
    .alert-error {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FECACA;
    }
    
    .alert-warning {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }
  `;
}

// Header HTML
function getHeaderHTML() {
  return `
    <div class="logo">
      <h1>KKS EXPRESS</h1>
      <p>Système de Paiement Livreurs</p>
    </div>
  `;
}

// Section statut
function getStatusSectionHTML(status, message) {
  let icon = '';
  let title = '';
  let statusMessage = '';
  
  switch(status) {
    case 'complet':
      icon = '<div class="success">✅</div>';
      title = 'Paiement Réussi!';
      statusMessage = message || 'Paiement confirmé avec succès!';
      break;
    case 'en_attente':
      icon = '<div class="pending">⏳</div>';
      title = 'En Attente';
      statusMessage = message || 'Paiement en attente de confirmation...';
      break;
    case 'error':
      icon = '<div class="error">❌</div>';
      title = 'Échec du Paiement';
      statusMessage = message || 'Erreur lors du paiement';
      break;
    default:
      icon = '<div class="spinner"></div>';
      title = 'Vérification en cours';
      statusMessage = 'Nous vérifions votre paiement...';
  }
  
  return `
    <div id="statusIcon" class="status-icon">
      ${icon}
    </div>
    <h2 id="statusTitle">${title}</h2>
    <p class="message" id="statusMessage">${statusMessage}</p>
    <div id="alertBox" class="alert hidden"></div>
  `;
}

// Boîte d'information
function getInfoBoxHTML(transactionId, livreurId, status) {
  return `
    <div class="info-box">
      <div class="info-item">
        <span class="info-label">Transaction ID:</span>
        <span class="info-value" id="transactionId">${transactionId || 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Livreur ID:</span>
        <span class="info-value" id="livreurId">${livreurId || 'N/A'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Statut initial:</span>
        <span class="info-value" id="initialStatus">${status}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Dernière vérification:</span>
        <span class="info-value" id="lastCheck">En cours...</span>
      </div>
    </div>
  `;
}

// Actions (boutons)
function getActionsHTML() {
  return `
    <div class="actions">
      <button id="verifyBtn" class="btn btn-primary">
        <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Vérifier Maintenant
      </button>
      
      <button id="dashboardBtn" class="btn btn-secondary hidden">
        <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Tableau de Bord
      </button>
      
      <button id="retryBtn" class="btn btn-secondary hidden">
        <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Réessayer
      </button>
    </div>
  `;
}

// Footer
function getFooterHTML() {
  return `
    <div class="footer">
      <p>© ${new Date().getFullYear()} KKS Technologies. Tous droits réservés.</p>
      <p>Support: support@kks-express.com</p>
    </div>
  `;
}

// JavaScript
function getJavaScript(transactionId, livreurId, status, message, apiUrl) {
  return `
    // Configuration
    const API_URL = '${apiUrl}';
    const TRANSACTION_ID = '${transactionId || ''}';
    const LIVREUR_ID = '${livreurId || ''}';
    const INITIAL_STATUS = '${status}';
    const INITIAL_MESSAGE = '${message}';
    
    // Éléments DOM
    const statusIcon = document.getElementById('statusIcon');
    const statusTitle = document.getElementById('statusTitle');
    const statusMessage = document.getElementById('statusMessage');
    const alertBox = document.getElementById('alertBox');
    const verifyBtn = document.getElementById('verifyBtn');
    const dashboardBtn = document.getElementById('dashboardBtn');
    const retryBtn = document.getElementById('retryBtn');
    const lastCheckEl = document.getElementById('lastCheck');
    
    // États
    let currentStatus = INITIAL_STATUS;
    let checkInterval = null;
    let checkCount = 0;
    const MAX_CHECKS = 10;
    
    // Fonctions d'affichage
    function showLoading() {
      statusIcon.innerHTML = '<div class="spinner"></div>';
      statusTitle.textContent = 'Vérification en cours';
      statusMessage.textContent = 'Nous vérifions le statut de votre paiement...';
      hideAlert();
    }
    
    function showSuccess(message = 'Paiement confirmé avec succès!') {
      statusIcon.innerHTML = '<div class="success">✅</div>';
      statusTitle.textContent = 'Paiement Réussi!';
      statusMessage.textContent = message;
      showAlert('success', 'Félicitations! Votre paiement a été validé.');
      
      verifyBtn.classList.add('hidden');
      dashboardBtn.classList.remove('hidden');
      retryBtn.classList.add('hidden');
      
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    }
    
    function showPending(message = 'Paiement en attente de confirmation') {
      statusIcon.innerHTML = '<div class="pending">⏳</div>';
      statusTitle.textContent = 'En Attente';
      statusMessage.textContent = message;
      showAlert('warning', 'Le paiement est en cours de traitement...');
      
      verifyBtn.classList.remove('hidden');
      dashboardBtn.classList.add('hidden');
      retryBtn.classList.add('hidden');
    }
    
    function showError(message = 'Erreur lors du paiement') {
      statusIcon.innerHTML = '<div class="error">❌</div>';
      statusTitle.textContent = 'Échec du Paiement';
      statusMessage.textContent = message;
      showAlert('error', 'Une erreur est survenue lors du traitement.');
      
      verifyBtn.classList.add('hidden');
      dashboardBtn.classList.remove('hidden');
      retryBtn.classList.remove('hidden');
    }
    
    function showAlert(type, message) {
      alertBox.className = 'alert alert-' + type;
      alertBox.textContent = message;
      alertBox.classList.remove('hidden');
    }
    
    function hideAlert() {
      alertBox.classList.add('hidden');
    }
    
    function updateLastCheck() {
      const now = new Date();
      lastCheckEl.textContent = now.toLocaleTimeString('fr-FR');
    }
    
    // Fonction de vérification du paiement
    async function verifyPayment() {
      try {
        checkCount++;
        updateLastCheck();
        showLoading();
        
        console.log('Vérification #' + checkCount + ' pour transaction: ' + TRANSACTION_ID);
        
        // Simulation de réponse API (à remplacer par un vrai appel)
        const mockResponse = {
          success: true,
          etat: currentStatus,
          message: INITIAL_MESSAGE
        };
        
        // Traitement de la réponse
        if (mockResponse.success) {
          if (mockResponse.etat === 'complet') {
            showSuccess(mockResponse.message);
            currentStatus = 'complet';
          } else if (mockResponse.etat === 'en_attente') {
            showPending(mockResponse.message);
            currentStatus = 'en_attente';
            
            if (checkCount >= MAX_CHECKS) {
              showError('Temps d\\'attente dépassé. Vérifiez manuellement.');
            }
          } else {
            showError(mockResponse.message || 'Statut inconnu');
            currentStatus = 'error';
          }
        } else {
          showError(mockResponse.message || 'Échec de vérification');
          currentStatus = 'error';
        }
        
      } catch (error) {
        console.error('Erreur vérification:', error);
        showError('Erreur de connexion au serveur');
        currentStatus = 'error';
      }
    }
    
    // Événements des boutons
    verifyBtn.addEventListener('click', verifyPayment);
    
    dashboardBtn.addEventListener('click', function() {
      window.location.href = '/dashboard';
    });
    
    retryBtn.addEventListener('click', function() {
      checkCount = 0;
      verifyPayment();
    });
    
    // Initialisation
    document.addEventListener('DOMContentLoaded', function() {
      if (INITIAL_STATUS === 'complet' || INITIAL_MESSAGE === 'SUCCES') {
        showSuccess('Paiement confirmé');
        currentStatus = 'complet';
      } else if (INITIAL_STATUS === 'PAYMENT') {
        showPending('Paiement en cours de traitement');
        currentStatus = 'en_attente';
      } else if (INITIAL_MESSAGE.includes('FAILED') || INITIAL_MESSAGE.includes('REFUSED')) {
        showError('Paiement refusé');
        currentStatus = 'error';
      } else {
        showPending();
        currentStatus = 'en_attente';
      }
      
      verifyPayment();
      
      checkInterval = setInterval(() => {
        if (currentStatus === 'en_attente' && checkCount < MAX_CHECKS) {
          verifyPayment();
        }
      }, 5000);
    });
  `;
}