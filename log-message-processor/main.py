import time
import redis
import os
import json
import requests
import random
from py_zipkin.zipkin import zipkin_span, ZipkinAttrs, generate_random_64bit_string

def log_message(message):
    # Simulamos un pequeño retraso de procesamiento
    time_delay = random.randrange(0, 1000)
    time.sleep(time_delay / 1000)
    print(f'[*] Mensaje procesado tras {time_delay}ms: {message}')

if __name__ == '__main__':
    # --- 1. CARGA DE CONFIGURACIÓN ---
    redis_host = os.environ.get('REDIS_HOST', 'localhost')
    redis_port = int(os.environ.get('REDIS_PORT', 6379))
    redis_password = os.environ.get('REDIS_PASSWORD', None) # Seguridad activada
    redis_channel = os.environ.get('REDIS_CHANNEL', 'log_channel')
    
    # Manejo de Zipkin deshabilitable
    zipkin_url = os.environ.get('ZIPKIN_URL', '')
    if zipkin_url.lower() == 'disabled':
        zipkin_url = ''

    def http_transport(encoded_span):
        try:
            requests.post(
                zipkin_url,
                data=encoded_span,
                headers={'Content-Type': 'application/x-thrift'},
                timeout=2 # Evitamos que el procesador se quede colgado
            )
        except Exception as e:
            print(f"Error enviando a Zipkin: {e}")

    # --- 2. CONEXIÓN SEGURA A REDIS ---
    # Añadimos el parámetro password
    r_client = redis.Redis(
        host=redis_host, 
        port=redis_port, 
        password=redis_password, 
        db=0
    )
    
    pubsub = r_client.pubsub()
    pubsub.subscribe([redis_channel])

    print(f"Log Processor iniciado. Escuchando canal: {redis_channel}")
    if not zipkin_url:
        print("Trazabilidad con Zipkin: DESHABILITADA")

    # --- 3. BUCLE DE PROCESAMIENTO (CQRS EVENTS) ---
    for item in pubsub.listen():
        # Ignorar mensajes de suscripción inicial
        if item['type'] != 'message':
            continue

        try:
            message = json.loads(item['data'].decode("utf-8"))
        except Exception as e:
            print(f"Error decodificando JSON: {e}")
            continue

        # LÓGICA DE TRAZABILIDAD
        # Si Zipkin está apagado o el mensaje no trae trazas, procesamos normal
        if not zipkin_url or 'zipkinSpan' not in message:
            log_message(message)
            continue

        # Si hay Zipkin, intentamos el span
        span_data = message['zipkinSpan']
        try:
            with zipkin_span(
                service_name='log-message-processor',
                zipkin_attrs=ZipkinAttrs(
                    trace_id=span_data['_traceId']['value'],
                    span_id=generate_random_64bit_string(),
                    parent_span_id=span_data['_spanId'],
                    is_sampled=span_data['_sampled']['value'],
                    flags=None
                ),
                span_name='save_log',
                transport_handler=http_transport,
                sample_rate=100
            ):
                log_message(message)
        except Exception as e:
            # Si falla Zipkin, no perdemos el log, solo avisamos
            print(f'Error en Zipkin Span: {e}')
            log_message(message)