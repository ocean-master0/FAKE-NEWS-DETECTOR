from flask import Flask, render_template, request, jsonify
import pickle
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
import pandas as pd
from datetime import datetime
import os

app = Flask(__name__)

# Load model and vectorizer on startup
try:
    with open('model/fake_news_model.pkl', 'rb') as f:
        model = pickle.load(f)
    with open('model/vectorizer.pkl', 'rb') as f:
        vectorizer = pickle.load(f)
    model_loaded = True
except FileNotFoundError:
    model_loaded = False
    print("Warning: Model files not found. Please train the model first.")

# Initialize NLTK components
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

ps = PorterStemmer()
stop_words = set(stopwords.words('english'))

def preprocess_text(text):
    """Preprocess text for prediction"""
    if not text or pd.isna(text):
        return ""
    
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    words = text.split()
    words = [ps.stem(word) for word in words if word not in stop_words]
    return ' '.join(words)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/model-info')
def model_info():
    return render_template('model-info.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/predict', methods=['POST'])
def predict():
    if not model_loaded:
        return jsonify({
            'error': 'Model not loaded. Please train the model first.',
            'success': False
        })
    
    try:
        data = request.json
        headline = data.get('headline', '')
        content = data.get('content', '')
        
        full_text = f"{headline} {content}".strip()
        
        if not full_text:
            return jsonify({
                'error': 'Please provide either a headline or content.',
                'success': False
            })
        
        processed_text = preprocess_text(full_text)
        text_vector = vectorizer.transform([processed_text])
        
        prediction = model.predict(text_vector)[0]
        probability = model.predict_proba(text_vector)[0]
        confidence = max(probability) * 100
        
        result = "Real" if prediction == 1 else "Fake"
        
        return jsonify({
            'success': True,
            'result': result,
            'confidence': round(confidence, 2),
            'headline': headline,
            'content': content[:200] + '...' if len(content) > 200 else content,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Prediction error: {str(e)}',
            'success': False
        })

if __name__ == '__main__':
    app.run(debug=True)
