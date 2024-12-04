import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

function logMockServer(message: string, payload?: any) {
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  
  const logMessage = payload
    ? `[Mock FAL.ai] [${timestamp}] - ${message} - Payload: ${JSON.stringify(payload)}`
    : `[Mock FAL.ai] [${timestamp}] - ${message}`;
  
  console.log(logMessage);
}

const mockServer = express();
mockServer.use(cors());
mockServer.use(bodyParser.json());

// Log all incoming requests with detailed information
mockServer.use((req, res, next) => {
  const requestDetails = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    query: req.query
  };
  
  logMockServer(`Incoming request details:`, requestDetails);

  // Capture response data
  const originalJson = res.json;
  res.json = function (body) {
    logMockServer(`Sending response:`, body);
    return originalJson.call(this, body);
  };

  next();
});

// Mock storage for uploaded files
const mockStorage = new Map<string, Buffer>();

// Mock FAL.ai storage endpoint
mockServer.post('/storage/upload', (req, res) => {
  const fileId = `mock-file-${Date.now()}`;
  const mockUrl = `http://localhost:5001/storage/${fileId}`;
  
  const response = {
    url: mockUrl,
    id: fileId
  };
  
  logMockServer('Storage upload completed', response);
  res.json(response);
});

// Mock FAL.ai model endpoint
mockServer.post('/model/train', (req, res) => {
  const modelId = `mock-model-${Date.now()}`;
  logMockServer('Starting model training', { modelId, request: req.body });
  
  // Simulate training progress
  setTimeout(() => {
    const response = {
      id: modelId,
      status: 'completed',
      result: {
        diffusers_lora_file: {
          url: "https://v3.fal.media/files/penguin/MfKRMr7gp6TqNfttnWt84_pytorch_lora_weights.safetensors",
          content_type: "application/octet-stream",
          file_name: "pytorch_lora_weights.safetensors",
          file_size: 89745224
        },
        config_file: {
          url: "https://v3.fal.media/files/lion/1_jzXYliDKoqpnsl2ZUap_config.json",
          content_type: "application/octet-stream",
          file_name: "config.json",
          file_size: 452
        }
      }
    };
    
    logMockServer('Model training completed', response);
    res.json(response);
  }, 2000); // Simulate 2-second training time
});

// Mock file retrieval endpoint
mockServer.get('/storage/:fileId', (req, res) => {
  const { fileId } = req.params;
  const file = mockStorage.get(fileId);
  
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  
  res.send(file);
});

export const startMockServer = (port: number = 5001) => {
  return new Promise<void>((resolve, reject) => {
    try {
      mockServer.listen(port, () => {
        console.log(`Mock FAL.ai server running on port ${port}`);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default mockServer;
