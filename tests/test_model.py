import pickle
import pandas as pd
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

# Initialize NLTK
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)
ps = PorterStemmer()
stop_words = set(stopwords.words('english'))

def preprocess_text(text):
    if pd.isna(text):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    words = text.split()
    words = [ps.stem(word) for word in words if word not in stop_words]
    return ' '.join(words)

# Load model and vectorizer
with open('model/fake_news_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('model/vectorizer.pkl', 'rb') as f:
    vectorizer = pickle.load(f)

def predict_news(headline, content):
    """Predict if news is fake or real"""
    full_text = f"{headline} {content}".strip()
    processed_text = preprocess_text(full_text)
    text_vector = vectorizer.transform([processed_text])
    
    prediction = model.predict(text_vector)[0]
    probability = model.predict_proba(text_vector)[0]
    confidence = max(probability) * 100
    
    result = "Real" if prediction == 1 else "Fake"
    
    return {
        'result': result,
        'confidence': round(confidence, 2),
        'headline': headline,
        'content': content[:200] + '...' if len(content) > 200 else content
    }

# Test examples
if __name__ == "__main__":
    print("🔍 Fake News Detector - Model Testing")
    print("=" * 40)
    
    # Test cases
    test_cases = [
        {
            'headline': 'Scientists Discover Breakthrough in Cancer Treatment',
            'content': 'Researchers at leading universities have announced a significant breakthrough in cancer treatment that could revolutionize medical care. The new treatment method has shown promising results in clinical trials.'
        },
        {
            'headline': 'SHOCKING: Aliens Land in New York City',
            'content': 'Witnesses report seeing mysterious spacecraft landing in Central Park. Government officials refuse to comment. This could be the biggest story in human history!'
        }
    ]
    
    for i, case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}:")
        print(f"Headline: {case['headline']}")
        print(f"Content: {case['content']}")
        
        result = predict_news(case['headline'], case['content'])
        print(f"Prediction: {result['result']} ({result['confidence']}% confidence)")
        print("-" * 40)
