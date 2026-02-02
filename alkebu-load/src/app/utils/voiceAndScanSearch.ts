// Voice Search and Barcode Scanner Utilities for Client-Side Use

export interface VoiceSearchOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResult?: (transcript: string, confidence: number) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface BarcodeResult {
  text: string;
  format: string;
  rawValue?: string;
}

export interface BarcodeScanOptions {
  onResult?: (result: BarcodeResult) => void;
  onError?: (error: string) => void;
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

/**
 * Voice Search Implementation using Web Speech API
 * This should be used on the client-side only
 */
export class VoiceSearch {
  private recognition: any = null;
  private isListening = false;
  private options: VoiceSearchOptions;

  constructor(options: VoiceSearchOptions = {}) {
    this.options = {
      language: 'en-US',
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      ...options
    };

    this.initializeRecognition();
  }

  private initializeRecognition() {
    if (typeof window === 'undefined') {
      console.warn('Voice search is only available in browser environment');
      return;
    }

    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser');
      this.options.onError?.('Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.options.language;
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.maxAlternatives = this.options.maxAlternatives;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.options.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          this.options.onResult?.(finalTranscript.trim(), confidence);
        } else {
          interimTranscript += transcript;
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      this.options.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.options.onEnd?.();
    };
  }

  /**
   * Start voice recognition
   */
  start(): boolean {
    if (!this.recognition) {
      this.options.onError?.('Speech recognition not initialized');
      return false;
    }

    if (this.isListening) {
      this.options.onError?.('Already listening');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      this.options.onError?.('Failed to start speech recognition');
      return false;
    }
  }

  /**
   * Stop voice recognition
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Check if voice search is supported
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SpeechRecognition;
  }

  /**
   * Get available languages for voice recognition
   */
  static getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-NZ', 'en-ZA',
      'es-ES', 'es-MX', 'es-AR', 'es-CO', 'es-CL', 'es-VE', 'es-PE',
      'fr-FR', 'fr-CA', 'fr-BE', 'fr-CH',
      'de-DE', 'de-AT', 'de-CH',
      'it-IT', 'it-CH',
      'pt-BR', 'pt-PT',
      'ru-RU',
      'ja-JP',
      'ko-KR',
      'zh-CN', 'zh-TW', 'zh-HK',
      'ar-SA', 'ar-EG',
      'hi-IN',
      'th-TH',
      'tr-TR',
      'pl-PL',
      'nl-NL', 'nl-BE',
      'sv-SE',
      'da-DK',
      'no-NO',
      'fi-FI'
    ];
  }
}

/**
 * Barcode Scanner Implementation using QuaggaJS
 * This should be used on the client-side only
 */
export class BarcodeScanner {
  private isScanning = false;
  private options: BarcodeScanOptions;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private stream: MediaStream | null = null;

  constructor(options: BarcodeScanOptions = {}) {
    this.options = {
      facingMode: 'environment', // Back camera for barcode scanning
      width: 640,
      height: 480,
      ...options
    };
  }

  /**
   * Start barcode scanning
   */
  async start(videoElement: HTMLVideoElement, canvasElement?: HTMLCanvasElement): Promise<boolean> {
    if (typeof window === 'undefined') {
      this.options.onError?.('Barcode scanning is only available in browser environment');
      return false;
    }

    if (this.isScanning) {
      this.options.onError?.('Already scanning');
      return false;
    }

    if (!this.isSupported()) {
      this.options.onError?.('Camera access not supported');
      return false;
    }

    try {
      this.videoElement = videoElement;
      this.canvasElement = canvasElement || null;

      // Get camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.options.facingMode,
          width: { ideal: this.options.width },
          height: { ideal: this.options.height }
        }
      });

      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      this.isScanning = true;

      // Start scanning for barcodes
      this.scanForBarcodes();

      return true;
    } catch (error) {
      this.options.onError?.('Failed to access camera');
      return false;
    }
  }

  /**
   * Stop barcode scanning
   */
  stop(): void {
    this.isScanning = false;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Scan for barcodes in the video stream
   */
  private scanForBarcodes(): void {
    if (!this.isScanning || !this.videoElement) return;

    // This is a simplified implementation
    // In a real application, you would use a library like QuaggaJS or ZXing
    // For now, we'll simulate barcode detection
    
    const scanInterval = setInterval(() => {
      if (!this.isScanning) {
        clearInterval(scanInterval);
        return;
      }

      // Simulate barcode detection
      // In reality, this would analyze the video frame for barcodes
      this.detectBarcode();
    }, 100);
  }

  /**
   * Detect barcode from video frame
   * This is a placeholder - real implementation would use computer vision
   */
  private async detectBarcode(): Promise<void> {
    if (!this.videoElement || !this.isScanning) return;

    try {
      // This would typically use a barcode detection library
      // For demonstration, we'll use a hypothetical implementation
      
      // Create canvas for frame analysis
      if (!this.canvasElement) {
        this.canvasElement = document.createElement('canvas');
      }

      const canvas = this.canvasElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;

      // Draw current video frame to canvas
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

      // Get image data for barcode analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Simulate barcode detection result
      // In reality, this would use a library like QuaggaJS to analyze imageData
      const detectedBarcode = await this.analyzeImageForBarcode(imageData);

      if (detectedBarcode) {
        this.options.onResult?.(detectedBarcode);
        this.stop(); // Stop scanning after successful detection
      }
    } catch (error) {
      console.error('Barcode detection error:', error);
    }
  }

  /**
   * Analyze image data for barcodes
   * This is a placeholder for actual barcode detection logic
   */
  private async analyzeImageForBarcode(imageData: ImageData): Promise<BarcodeResult | null> {
    // This would integrate with a real barcode detection library
    // For now, return null (no barcode detected)
    return null;
  }

  /**
   * Check if barcode scanning is supported
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Get supported barcode formats
   */
  static getSupportedFormats(): string[] {
    return [
      'EAN-13',
      'EAN-8',
      'UPC-A',
      'UPC-E',
      'Code 128',
      'Code 39',
      'Code 93',
      'Codabar',
      'ITF',
      'RSS-14',
      'RSS Expanded',
      'QR Code',
      'Data Matrix',
      'PDF417'
    ];
  }
}

/**
 * ISBN-specific barcode utilities
 */
export class ISBNScanner extends BarcodeScanner {
  constructor(options: BarcodeScanOptions = {}) {
    super(options);
  }

  /**
   * Validate and format ISBN from barcode scan
   */
  static validateISBN(barcode: string): { valid: boolean; isbn: string; type: 'ISBN-10' | 'ISBN-13' | null } {
    // Remove any non-digit characters
    const digits = barcode.replace(/\D/g, '');

    if (digits.length === 10) {
      // Validate ISBN-10
      if (this.validateISBN10(digits)) {
        return { valid: true, isbn: digits, type: 'ISBN-10' };
      }
    } else if (digits.length === 13) {
      // Validate ISBN-13
      if (this.validateISBN13(digits)) {
        return { valid: true, isbn: digits, type: 'ISBN-13' };
      }
    }

    return { valid: false, isbn: barcode, type: null };
  }

  /**
   * Validate ISBN-10 checksum
   */
  private static validateISBN10(isbn: string): boolean {
    if (isbn.length !== 10) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (10 - i);
    }

    const lastChar = isbn[9];
    const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
    if (isNaN(checkDigit) && lastChar !== 'X') return false;

    return (sum + checkDigit) % 11 === 0;
  }

  /**
   * Validate ISBN-13 checksum
   */
  private static validateISBN13(isbn: string): boolean {
    if (isbn.length !== 13) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(isbn[i]);
      if (isNaN(digit)) return false;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = parseInt(isbn[12]);
    if (isNaN(checkDigit)) return false;

    return (sum + checkDigit) % 10 === 0;
  }

  /**
   * Convert ISBN-10 to ISBN-13
   */
  static convertISBN10to13(isbn10: string): string | null {
    if (!this.validateISBN10(isbn10)) return null;

    const isbn12 = '978' + isbn10.substring(0, 9);
    let sum = 0;
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn12[i]) * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return isbn12 + checkDigit;
  }

  /**
   * Convert ISBN-13 to ISBN-10 (if it starts with 978)
   */
  static convertISBN13to10(isbn13: string): string | null {
    if (!this.validateISBN13(isbn13)) return null;
    if (!isbn13.startsWith('978')) return null;

    const isbn9 = isbn13.substring(3, 12);
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn9[i]) * (10 - i);
    }

    const checkDigit = (11 - (sum % 11)) % 11;
    const checkChar = checkDigit === 10 ? 'X' : checkDigit.toString();

    return isbn9 + checkChar;
  }
}

/**
 * Search integration utilities
 */
export const searchIntegration = {
  /**
   * Process voice search result and perform search
   */
  async processVoiceSearch(transcript: string, confidence: number): Promise<any> {
    if (confidence < 0.7) {
      throw new Error('Voice recognition confidence too low');
    }

    // Clean up the transcript
    const cleanQuery = transcript
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanQuery.length < 2) {
      throw new Error('Search query too short');
    }

    // Perform search via API
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: cleanQuery,
        searchSource: 'voice',
        types: ['books', 'products'] // Focus on searchable products for voice
      })
    });

    if (!response.ok) {
      throw new Error('Search request failed');
    }

    return await response.json();
  },

  /**
   * Process barcode scan result and search for book
   */
  async processBarcodeSearch(barcode: string): Promise<any> {
    const isbnValidation = ISBNScanner.validateISBN(barcode);
    
    if (!isbnValidation.valid) {
      throw new Error('Invalid ISBN barcode');
    }

    // Search internal catalog first
    const internalResponse = await fetch(`/api/search?q=${encodeURIComponent(isbnValidation.isbn)}&types=books`);
    
    if (internalResponse.ok) {
      const internalResults = await internalResponse.json();
      if (internalResults.internal.length > 0) {
        return {
          source: 'internal',
          isbn: isbnValidation.isbn,
          results: internalResults
        };
      }
    }

    // If not found internally, search external sources
    const externalResponse = await fetch(`/api/external-books?isbn=${encodeURIComponent(isbnValidation.isbn)}`);
    
    if (externalResponse.ok) {
      const externalResults = await externalResponse.json();
      return {
        source: 'external',
        isbn: isbnValidation.isbn,
        results: externalResults
      };
    }

    throw new Error('Book not found');
  }
};

// Export instances for convenience
export const voiceSearch = (options?: VoiceSearchOptions) => new VoiceSearch(options);
export const barcodeScanner = (options?: BarcodeScanOptions) => new BarcodeScanner(options);
export const isbnScanner = (options?: BarcodeScanOptions) => new ISBNScanner(options);