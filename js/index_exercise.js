let mobilenet;
let model;
const webcam = new Webcam(document.getElementById('wc'));
const dataset = new RPSDataset();
var rockSamples=0, paperSamples=0, scissorsSamples=0;
let isPredicting = false;

async function loadMobilenet() {
  const mobilenet = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json');
  const layer = mobilenet.getLayer('conv_pw_13_relu');
  const tfmodel = tf.model({inputs: mobilenet.inputs, outputs: layer.output});
  console.log('Mobilenet model created')
  return tfmodel
}

async function loadRPSnet() {

  // const model = await tf.loadLayersModel("{{ `tf/my_model.json` | absURL }}");
  const model = await tf.loadLayersModel("https://rolozanod.github.io/tf/my_model.json");
  console.log('RPS model created')
  return model
}

async function loadRPSnet() {

  // const model = await tf.loadLayersModel("{{ `tf/my_model.json` | absURL }}");
  // Load the faceLandmarksDetection model assets.
  const face_model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
  console.log('FLD model created')
  return face_model
}

async function train() {
  dataset.ys = null;
  dataset.encodeLabels(3);
    
  // In the space below create a neural network that can classify hand gestures
  // corresponding to rock, paper, scissors, lizard, and spock. The first layer
  // of your network should be a flatten layer that takes as input the output
  // from the pre-trained MobileNet model. Since we have 5 classes, your output
  // layer should have 5 units and a softmax activation function. You are free
  // to use as many hidden layers and neurons as you like.  
  // HINT: Take a look at the Rock-Paper-Scissors example. We also suggest
  // using ReLu activation functions where applicable.
  // Changed to 3 units (rock, paper and scissors)

  model = tf.sequential({
    layers: [
      tf.layers.flatten({inputShape: mobilenet.outputs[0].shape.slice(1)}),
      tf.layers.dense({ units: 100, activation: 'relu'}),
      tf.layers.dense({ units: 3, activation: 'softmax'})
    ]
  });
   
  // Set the optimizer to be tf.train.adam() with a learning rate of 0.0001.
  const optimizer = tf.train.adam(0.0001);
    
        
  // Compile the model using the categoricalCrossentropy loss, and
  // the optimizer you defined above.
  model.compile({optimizer: optimizer, loss: 'categoricalCrossentropy'});
 
  let loss = 0;
  model.fit(dataset.xs, dataset.ys, {
    epochs: 10,
    callbacks: {
      onBatchEnd: async (batch, logs) => {
        loss = logs.loss.toFixed(3);
        console.log('LOSS: ' + loss);
        }
      }
   });
}


function handleButton(elem){
	switch(elem.id){
		case "0":
			rockSamples++;
			document.getElementById("rocksamples").innerText = "Rock samples:" + rockSamples;
			break;
		case "1":
			paperSamples++;
			document.getElementById("papersamples").innerText = "Paper samples:" + paperSamples;
			break;
		case "2":
			scissorsSamples++;
			document.getElementById("scissorssamples").innerText = "Scissors samples:" + scissorsSamples;
			break;            
	}
	label = parseInt(elem.id);
	const img = webcam.capture();
	dataset.addExample(mobilenet.predict(img), label);

}

async function predict() {
  while (isPredicting) {
    const predictedClass = tf.tidy(() => {
      const img = webcam.capture();
      const activation = mobilenet.predict(img);
      const predictions = model.predict(activation);

      // Pass in a video stream to the model to obtain an array of detected faces from the MediaPipe graph.
      // For Node users, the `estimateFaces` API also accepts a `tf.Tensor3D`, or an ImageData object.
      // https://blog.tensorflow.org/2020/11/iris-landmark-tracking-in-browser-with-MediaPipe-and-TensorFlowJS.html
      // https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection/src/tfjs
      // https://javascript.plainenglish.io/face-detection-in-the-browser-using-tensorflow-js-facb2304ed91
      // const video = document.querySelector("video");
      // const faces = await model.estimateFaces({ input: img });

      return predictions.as1D().argMax();
    });
    const classId = (await predictedClass.data())[0];
    var predictionText = "";
    switch(classId){
		case 0:
			predictionText = "I see Rock";
			break;
		case 1:
			predictionText = "I see Paper";
			break;
		case 2:
			predictionText = "I see Scissors";
			break;          
	}
	document.getElementById("prediction").innerText = predictionText;
			
    
    predictedClass.dispose();
    await tf.nextFrame();

  }
}


function doTraining(){
	train();
	alert("Training Done!")
}

function startPredicting(){
	isPredicting = true;
	predict();
}

function stopPredicting(){
	isPredicting = false;
	predict();
}


function saveModel(){
    model.save('downloads://my_model');
}


async function init(){
	await webcam.setup();

	mobilenet = await loadMobilenet();
  const activation = tf.tidy(() => mobilenet.predict(webcam.capture()));

  model = await loadRPSnet();
  tf.tidy(() => model.predict(activation));
}


init();