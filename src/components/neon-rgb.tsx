import { useEffect, useRef } from 'react'

export function NeonRGBTextEffect({ text, isMobile }: { text: string, isMobile?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const gl = canvas.getContext('webgl')
        if (!gl) return

        const vertexShader = gl.createShader(gl.VERTEX_SHADER)!
        gl.shaderSource(vertexShader, `
            attribute vec2 position;
            uniform float uAspect;
            varying vec2 vUv;
            void main() {
                vUv = vec2(position.x * 0.5 + 0.5, 1.0 - (position.y * 0.5 + 0.5));
                vec2 pos = position;
                pos.y *= 0.25; // Makes the text render in a band 1/4 the height of the canvas
                // Better aspect ratio handling to prevent overflow
                float scaleX = min(1.0, 1.0/uAspect) * 0.9; // Scale down slightly and respect aspect ratio
                pos.x *= scaleX;
                gl_Position = vec4(pos, 0.0, 1.0);
            }
        `)
        gl.compileShader(vertexShader)

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!
        gl.shaderSource(fragmentShader, `
            precision mediump float;
            uniform sampler2D uTexture;
            uniform vec2 uOffset;
            uniform vec3 uColor;
            varying vec2 vUv;

            void main() {
                vec2 distortedUv = vUv + vec2(uOffset.x, -uOffset.y);
                vec4 texel = texture2D(uTexture, distortedUv);
                gl_FragColor = vec4(uColor * texel.a * 1.5, texel.a);
            }
        `)
        gl.compileShader(fragmentShader)

        const program = gl.createProgram()!
        gl.attachShader(program, vertexShader)
        gl.attachShader(program, fragmentShader)
        gl.linkProgram(program)
        gl.useProgram(program)

        const vertices = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ])
        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

        const positionLocation = gl.getAttribLocation(program, 'position')
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        const textCanvas = document.createElement('canvas')
        const textCtx = textCanvas.getContext('2d')!
        // Adjust text canvas size and font based on isMobile
        textCanvas.width = isMobile ? 1024 : 1024; // Keep texture resolution high
        textCanvas.height = isMobile ? 256 : 256; // Keep texture resolution high

        textCtx.fillStyle = 'rgba(0, 0, 0, 0)'
        textCtx.fillRect(0, 0, textCanvas.width, textCanvas.height)

        textCtx.fillStyle = '#ffffff'
        const fontSize = isMobile ? '160px' : '140px'; // Larger font on mobile
        textCtx.font = `${fontSize} serif`;
        textCtx.textAlign = 'center'
        textCtx.textBaseline = 'middle'
        textCtx.fillText(text, textCanvas.width / 2, textCanvas.height / 2)

        const texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

        const textureLocation = gl.getUniformLocation(program, 'uTexture')
        const offsetLocation = gl.getUniformLocation(program, 'uOffset')
        const colorLocation = gl.getUniformLocation(program, 'uColor')
        const aspectLocation = gl.getUniformLocation(program, 'uAspect')

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

        const setCanvasSize = () => {
            const parent = canvas.parentElement
            if (!parent) return

            canvas.style.width = '100%'
            canvas.style.height = '100%'
            canvas.style.display = 'block'
            canvas.style.margin = '0'

            const rect = parent.getBoundingClientRect()
            const dpr = window.devicePixelRatio || 1
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr

            gl.viewport(0, 0, canvas.width, canvas.height)
            gl.uniform1f(aspectLocation, rect.width / rect.height)
            // uOffset is for the RGB shift, not general positioning.
            // gl.uniform2f(offsetLocation, 0, 0); // This was resetting offset for each channel before render

            render()
        }

        const render = () => {
            gl.clearColor(0, 0, 0, 0)
            gl.clear(gl.COLOR_BUFFER_BIT)

            const offsetAmount = isMobile ? 0.003 : 0.005; // Slightly reduce offset on mobile if desired
            const channels = [
                { color: [1, 0, 0], offset: [offsetAmount, 0] },
                { color: [0, 1, 0], offset: [0, 0] }, // Green channel, no offset
                { color: [0, 0, 1], offset: [-offsetAmount, 0] }
            ]

            channels.forEach(({ color, offset }) => {
                gl.uniform2fv(offsetLocation, offset) // Set individual offset for R and B channels
                gl.uniform3fv(colorLocation, color)
                gl.uniform1i(textureLocation, 0) // Use texture unit 0
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            })
        }

        setCanvasSize() // Initial render

        window.addEventListener('resize', setCanvasSize)

        // Cleanup function
        return () => {
            window.removeEventListener('resize', setCanvasSize)
            gl.deleteProgram(program)
            gl.deleteShader(vertexShader)
            gl.deleteShader(fragmentShader)
            gl.deleteBuffer(buffer)
            gl.deleteTexture(texture)
        }
    }, [text, isMobile]) // Add text and isMobile to dependency array

    return (
        <>
            <canvas ref={canvasRef} className="w-full h-full mb-0 -translate-y-10" />
        </>
    )
}