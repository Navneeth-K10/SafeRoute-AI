const AccidentSubmitService = {
  isSubmitting: false,

  init() {
    this.form = document.getElementById('accidentSubmitForm');
    this.typeInput = document.getElementById('accidentType');
    this.severityInput = document.getElementById('accidentSeverity');
    this.descInput = document.getElementById('accidentDescription');
    this.submitBtn = document.getElementById('submitAccidentBtn');
    this.messageDiv = document.getElementById('submitMessage');

    this.bindEvents();
  },

  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  },

  async handleSubmit(e) {
    e.preventDefault();

    if (this.isSubmitting) return;

    this.hideMessage();

    // 1. Validate Location
    if (!AccidentLocationService.isConfirmed || !AccidentLocationService.selectedLat || !AccidentLocationService.selectedLng) {
      this.showMessage('Please confirm the accident location on the map before submitting.', 'error');
      return;
    }

    // 2. Validate Photo
    if (!AccidentPhotoService.selectedPhotoFile) {
      this.showMessage('Please provide photo evidence of the accident before submitting.', 'error');
      return;
    }

    // 3. Build FormData
    const formData = new FormData();
    formData.append('accidentType', this.typeInput.value);
    formData.append('severity', this.severityInput.value);
    formData.append('description', this.descInput.value);
    formData.append('latitude', AccidentLocationService.selectedLat);
    formData.append('longitude', AccidentLocationService.selectedLng);
    formData.append('image', AccidentPhotoService.selectedPhotoFile);

    // 4. Send API Request
    try {
      this.setLoadingState(true);
      
      const response = await api.fetch('/accidents', {
        method: 'POST',
        body: formData
      });

      if (response.ok && response.data.success) {
        // Success
        this.showMessage(`Accident report submitted successfully.`, 'success', response.data.data);
        this.resetForm();
        
        // Auto-refresh reports list if available
        if (typeof AccidentHistoryService !== 'undefined') {
          AccidentHistoryService.fetchMyReports();
        }
      } else {
        // API Error
        this.showMessage(response.data.message || 'Failed to submit report. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Submission Error:', error);
      this.showMessage('Network error while submitting. Please check your connection.', 'error');
    } finally {
      this.setLoadingState(false);
    }
  },

  setLoadingState(isLoading) {
    this.isSubmitting = isLoading;
    if (isLoading) {
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = '<span class="animate-pulse">Submitting Report...</span>';
      this.submitBtn.classList.remove('bg-rose-600', 'hover:bg-rose-500');
      this.submitBtn.classList.add('bg-rose-800', 'cursor-not-allowed');
    } else {
      this.submitBtn.disabled = false;
      this.submitBtn.innerHTML = 'Submit Accident Report';
      this.submitBtn.classList.add('bg-rose-600', 'hover:bg-rose-500');
      this.submitBtn.classList.remove('bg-rose-800', 'cursor-not-allowed');
    }
  },

  showMessage(msg, type, data = null) {
    this.messageDiv.innerHTML = `<span>${msg}</span>`;
    
    if (data) {
      this.messageDiv.innerHTML += `<span class="text-white mt-1 font-mono text-[10px]">Report ID: ${data.id}</span>`;
      this.messageDiv.innerHTML += `<span class="text-amber-400 mt-1 font-bold text-[10px]">Status: ${data.status}</span>`;
      
      if (data.aiAnalysis) {
        const detectedText = data.aiAnalysis.detected ? 'Accident Detected' : 'No Accident Detected';
        const detectedColor = data.aiAnalysis.detected ? 'text-rose-400' : 'text-slate-400';
        const confidence = Math.round((data.aiAnalysis.confidence || 0) * 100);
        
        this.messageDiv.innerHTML += `
          <div class="mt-2 pt-2 border-t border-emerald-500/30 text-left flex flex-col gap-1 w-full text-[10px]">
            <span class="text-white font-bold mb-1">AI Analysis:</span>
            <span class="font-bold ${detectedColor}">${detectedText}</span>
            <span class="text-slate-300">AI Severity: <span class="text-white">${data.aiAnalysis.severity}</span></span>
            <span class="text-slate-300">Confidence: <span class="text-cyan-300">${confidence}%</span></span>
            <span class="text-slate-300">Provider: <span class="text-white">${data.aiAnalysis.provider}</span></span>
          </div>
        `;
      } else {
        this.messageDiv.innerHTML += `
          <div class="mt-2 pt-2 border-t border-emerald-500/30 text-left flex flex-col gap-1 w-full text-[10px]">
            <span class="text-white font-bold mb-1">AI Analysis:</span>
            <span class="text-slate-400 italic">AI analysis pending or unavailable.</span>
          </div>
        `;
      }
    }

    this.messageDiv.classList.remove('hidden', 'bg-rose-500/10', 'border-rose-500/30', 'text-rose-400', 'bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400', 'flex');
    this.messageDiv.classList.add('flex'); // Add flex back for the inner elements
    
    if (type === 'error') {
      this.messageDiv.classList.add('bg-rose-500/10', 'border-rose-500/30', 'text-rose-400');
    } else {
      this.messageDiv.classList.add('bg-emerald-500/10', 'border-emerald-500/30', 'text-emerald-400');
    }
  },

  hideMessage() {
    this.messageDiv.classList.add('hidden');
    this.messageDiv.classList.remove('flex');
    this.messageDiv.innerHTML = '';
  },

  resetForm() {
    // We intentionally don't clear the success message so the user can see their Report ID
    this.form.reset();
    
    // Clear photo and location to prevent accidental double-submits
    AccidentPhotoService.removePhoto();
    AccidentLocationService.isConfirmed = false;
    AccidentLocationService.resetConfirmButton();
    // Keep the map marker but require re-confirm
  }
};
