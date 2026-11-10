"""Local ONNX Food101 baseline. Dependencies/model location are explicit."""
import json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
import onnxruntime as ort
root=Path(os.environ.get('FOOD_MODEL_DIR','/tmp/nt-food-model'))
config=json.loads((root/'config.json').read_text())
processor=json.loads((root/'preprocessor_config.json').read_text())
session=ort.InferenceSession(str(root/'model.onnx'),providers=['CPUExecutionProvider'])
def classify(file, variant='resize'):
    image=ImageOps.exif_transpose(Image.open(file)).convert('RGB')
    if variant=='center': image=ImageOps.fit(image,(224,224),method=Image.Resampling.BICUBIC)
    else: image=image.resize((224,224),Image.Resampling.BICUBIC)
    a=np.asarray(image,dtype=np.float32)/255
    a=(a-np.array(processor['image_mean'],dtype=np.float32))/np.array(processor['image_std'],dtype=np.float32)
    logits=session.run(None,{session.get_inputs()[0].name:a.transpose(2,0,1)[None]})[0][0]
    probs=np.exp(logits-logits.max());probs/=probs.sum()
    return [{'identifier':config['id2label'][str(int(i))],'confidence':float(probs[i])} for i in np.argsort(probs)[-5:][::-1]]
if __name__=='__main__':
    print(json.dumps({'classes':classify(sys.argv[1],sys.argv[2] if len(sys.argv)>2 else 'resize')}))
