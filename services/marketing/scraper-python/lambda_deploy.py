#!/usr/bin/env python3
"""
AWS Lambda 배포 패키지 생성 스크립트
Playwright를 Lambda에서 실행하기 위한 설정 포함
"""

import os
import sys
import zipfile
import shutil
import subprocess
from pathlib import Path


def create_lambda_deployment():
    """Lambda 배포 패키지 생성"""
    
    print("=== AWS Lambda Deployment Package Builder ===\n")
    
    # 디렉토리 설정
    current_dir = Path.cwd()
    build_dir = current_dir / 'lambda_build'
    layer_dir = current_dir / 'lambda_layer'
    
    # 기존 빌드 디렉토리 정리
    if build_dir.exists():
        shutil.rmtree(build_dir)
    if layer_dir.exists():
        shutil.rmtree(layer_dir)
        
    build_dir.mkdir()
    layer_dir.mkdir()
    
    print("1. Preparing directories...")
    
    # Lambda 함수 코드 복사
    shutil.copy('smartplace_scraper.py', build_dir / 'lambda_function.py')
    
    # requirements.txt 수정 (Lambda용)
    lambda_requirements = """beautifulsoup4==4.12.3
requests==2.31.0
boto3==1.34.14
lxml==5.0.0
html5lib==1.1"""
    
    with open(build_dir / 'requirements.txt', 'w') as f:
        f.write(lambda_requirements)
    
    print("2. Installing dependencies...")
    
    # 의존성 설치 (Lambda 환경)
    subprocess.run([
        sys.executable, '-m', 'pip', 'install',
        '-r', str(build_dir / 'requirements.txt'),
        '-t', str(build_dir),
        '--platform', 'manylinux2014_x86_64',
        '--only-binary', ':all:'
    ], check=True)
    
    print("3. Creating Lambda function ZIP...")
    
    # Lambda 함수 ZIP 생성
    function_zip = current_dir / 'lambda_function.zip'
    with zipfile.ZipFile(function_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = Path(root) / file
                arc_name = file_path.relative_to(build_dir)
                zf.write(file_path, arc_name)
    
    print(f"   Created: {function_zip}")
    
    # Playwright Layer 생성 (별도)
    print("\n4. Creating Playwright Lambda Layer...")
    
    layer_python_dir = layer_dir / 'python'
    layer_python_dir.mkdir()
    
    # Playwright 설치
    subprocess.run([
        sys.executable, '-m', 'pip', 'install',
        'playwright==1.41.0',
        '-t', str(layer_python_dir),
        '--platform', 'manylinux2014_x86_64',
        '--only-binary', ':all:'
    ], check=True)
    
    # Chromium 바이너리 다운로드 스크립트
    download_script = layer_python_dir / 'download_chromium.py'
    download_script.write_text("""
import os
from playwright.sync_api import sync_playwright

def download():
    with sync_playwright() as p:
        # Chromium 다운로드
        p.chromium.launch()
        print("Chromium downloaded successfully")

if __name__ == '__main__':
    download()
""")
    
    # Layer ZIP 생성
    layer_zip = current_dir / 'playwright_layer.zip'
    with zipfile.ZipFile(layer_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(layer_dir):
            for file in files:
                file_path = Path(root) / file
                arc_name = file_path.relative_to(layer_dir)
                zf.write(file_path, arc_name)
    
    print(f"   Created: {layer_zip}")
    
    # 정리
    shutil.rmtree(build_dir)
    shutil.rmtree(layer_dir)
    
    print("\n=== Deployment Package Created Successfully! ===")
    print("\nNext steps:")
    print("1. Upload 'playwright_layer.zip' as a Lambda Layer")
    print("2. Upload 'lambda_function.zip' as your Lambda function")
    print("3. Configure Lambda with:")
    print("   - Runtime: Python 3.11")
    print("   - Handler: lambda_function.lambda_handler")
    print("   - Timeout: 60 seconds")
    print("   - Memory: 1024 MB")
    print("   - Environment variables:")
    print("     - PLAYWRIGHT_BROWSERS_PATH=/opt/python")
    
    return function_zip, layer_zip


if __name__ == '__main__':
    create_lambda_deployment()