# 学生のコードをホストから隔離して採点したいとき用。
#
#   docker build -t scoring server/
#   docker run --rm -p 8000:8000 \
#     -v "$HOME/.cache/huggingface:/cache/huggingface" \
#     scoring
#
# 第8回A を採点するなら、モデルのキャッシュを渡しておくと毎回落とさずに済む。
# GPU を使うなら --gpus all を足す (Apple Silicon の MPS はコンテナからは使えないので、
# Mac Studio では Docker を挟まず直接動かすこと)。
FROM python:3.13-slim

RUN useradd -m -u 1000 grader
WORKDIR /app

# 第8回A を採点しないなら、この2行は消してよい (イメージが 2GB 以上小さくなる)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir transformers

COPY --chown=grader:grader . /app/

ENV HF_HOME=/cache/huggingface \
    PYTHONDONTWRITEBYTECODE=1
USER grader
EXPOSE 8000
CMD ["python3", "server/app.py", "--host", "0.0.0.0", "--port", "8000"]
