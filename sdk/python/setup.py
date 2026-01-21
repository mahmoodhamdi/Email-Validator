from setuptools import setup, find_packages

setup(
    name="email-validator-sdk",
    version="1.0.0",
    author="Mahmood Hamdi",
    author_email="mwm.softwars.solutions@gmail.com",
    description="Official Python SDK for Email Validator API",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/mahmoodhamdi/Email-Validator",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.25.0",
        "aiohttp>=3.8.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.20.0",
        ],
    },
)
