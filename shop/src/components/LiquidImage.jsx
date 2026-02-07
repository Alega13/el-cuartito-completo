import React, { useRef, useEffect, useCallback, useState } from 'react';

const LiquidImage = ({ src, alt, className = '' }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const glRef = useRef(null);
    const programRef = useRef(null);
    const animationRef = useRef(null);
    const mouseRef = useRef({ x: 0.5, y: 0.5 });
    const rippleRef = useRef(0);
    const [webglFailed, setWebglFailed] = useState(false);
    const textureLoadedRef = useRef(false);

    const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        uniform sampler2D u_image;
        uniform vec2 u_mouse;
        uniform float u_ripple;
        uniform float u_time;
        varying vec2 v_texCoord;

        void main() {
            vec2 uv = v_texCoord;
            vec2 diff = uv - u_mouse;
            float dist = length(diff);
            
            float rippleEffect = u_ripple * 0.08;
            float wave = sin(dist * 25.0 - u_time * 3.0) * rippleEffect;
            wave *= smoothstep(0.5, 0.0, dist);
            wave *= smoothstep(0.0, 0.05, dist);
            
            vec2 displacement = normalize(diff + 0.001) * wave;
            uv += displacement;
            
            float organicWave = sin(uv.x * 12.0 + u_time * 1.5) * sin(uv.y * 12.0 + u_time * 1.5) * 0.003 * u_ripple;
            uv += vec2(organicWave, organicWave);
            
            uv = clamp(uv, 0.005, 0.995);
            
            vec4 color = texture2D(u_image, uv);
            gl_FragColor = color;
        }
    `;

    const createShader = useCallback((gl, type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }, []);

    const initWebGL = useCallback(() => {
        if (webglFailed) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', { alpha: true, antialias: true, preserveDrawingBuffer: true });
        if (!gl) {
            setWebglFailed(true);
            return;
        }
        glRef.current = gl;

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            setWebglFailed(true);
            return;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            setWebglFailed(true);
            return;
        }
        programRef.current = program;
        gl.useProgram(program);

        const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
        const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 20, 20, 255]));

        const image = new Image();
        image.crossOrigin = 'anonymous';

        image.onload = () => {
            try {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                textureLoadedRef.current = true;
            } catch (e) {
                setWebglFailed(true);
            }
        };

        image.onerror = () => {
            setWebglFailed(true);
        };

        image.src = src;

    }, [src, createShader, webglFailed, vertexShaderSource, fragmentShaderSource]);

    const render = useCallback((time) => {
        const gl = glRef.current;
        const program = programRef.current;

        if (!gl || !program || !textureLoadedRef.current) {
            animationRef.current = requestAnimationFrame(render);
            return;
        }

        rippleRef.current *= 0.93;

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.02, 0.02, 0.02, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform2f(gl.getUniformLocation(program, 'u_mouse'), mouseRef.current.x, 1.0 - mouseRef.current.y);
        gl.uniform1f(gl.getUniformLocation(program, 'u_ripple'), rippleRef.current);
        gl.uniform1f(gl.getUniformLocation(program, 'u_time'), time * 0.001);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationRef.current = requestAnimationFrame(render);
    }, []);

    const handleMouseMove = useCallback((e) => {
        const rect = (canvasRef.current || containerRef.current)?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        rippleRef.current = Math.min(rippleRef.current + 0.15, 2.5);
        mouseRef.current = { x, y };
    }, []);

    useEffect(() => {
        if (!webglFailed) {
            initWebGL();
            animationRef.current = requestAnimationFrame(render);
        }
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [initWebGL, render, webglFailed]);

    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const dpr = Math.min(window.devicePixelRatio || 1, 2);
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fallback: CSS-based effect when WebGL/CORS fails
    if (webglFailed) {
        return (
            <div
                ref={containerRef}
                className={`${className} overflow-hidden relative group`}
                onMouseMove={handleMouseMove}
            >
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ filter: 'saturate(1.1)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            className={className}
            onMouseMove={handleMouseMove}
            style={{ touchAction: 'none' }}
            aria-label={alt}
        />
    );
};

export default LiquidImage;
