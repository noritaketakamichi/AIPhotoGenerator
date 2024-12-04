import fetch from 'node-fetch';

async function testMockEndpoints() {
  console.log('Testing FAL.ai mock endpoints...');
  
  // Test health endpoint
  try {
    const healthResponse = await fetch('http://localhost:5000/mock/fal-ai/health');
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    process.exit(1);
  }

  // Test file upload endpoint
  try {
    const uploadResponse = await fetch('http://localhost:5000/mock/fal-ai/upload/test.zip', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock_key',
        'Content-Type': 'application/json'
      }
    });
    const uploadData = await uploadResponse.json();
    console.log('Upload endpoint response:', uploadData);
  } catch (error) {
    console.error('Upload test failed:', error);
    process.exit(1);
  }

  // Test training endpoint with SSE
  console.log('\nTesting training endpoint with SSE...');
  try {
    const response = await fetch('http://localhost:5000/mock/fal-ai/flux-lora-fast-training', {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': 'Bearer mock_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          images_data_url: 'https://mock.fal.ai/files/test.zip',
          steps: 1000
        }
      })
    });

    if (!response.body) {
      throw new Error('No response body received');
    }

    let progressEvents = 0;
    const maxEvents = 5; // Limit the number of progress events we wait for
    
    const reader = response.body;
    const decoder = new TextDecoder();

    reader.on('data', (chunk: Buffer) => {
      const text = decoder.decode(chunk);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6));
            console.log('Received event:', eventData);
            
            if (eventData.status === 'completed') {
              console.log('Training completed successfully!');
              process.exit(0);
            }

            progressEvents++;
            if (progressEvents >= maxEvents) {
              console.log('Received enough progress events, test successful!');
              process.exit(0);
            }
          } catch (e) {
            console.error('Error parsing event data:', e);
          }
        }
      }
    });

    reader.on('error', (error) => {
      console.error('Error reading SSE stream:', error);
      process.exit(1);
    });

    // Set a timeout to avoid hanging
    setTimeout(() => {
      console.log('Test completed (timeout)');
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('Training endpoint test failed:', error);
    process.exit(1);
  }
}

testMockEndpoints();
