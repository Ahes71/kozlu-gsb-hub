from PIL import Image,ImageDraw
from pathlib import Path
for size in [192,512]:
 im=Image.new('RGB',(size,size),'#176b59');d=ImageDraw.Draw(im);s=size/64
 pts=lambda a:[(int(x*s),int(y*s)) for x,y in a]
 d.line(pts([(21,17),(21,47)]),fill='white',width=int(6*s))
 d.line(pts([(43,17),(23,32),(43,47)]),fill='white',width=int(6*s))
 im.save(Path('public')/f'icon-{size}.png')
