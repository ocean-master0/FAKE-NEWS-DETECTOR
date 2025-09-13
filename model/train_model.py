import pandas as pd
import numpy as np
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import os
import warnings
warnings.filterwarnings('ignore')

# Download NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

class FakeNewsModelTrainer:
    def __init__(self):
        self.models = {
            'logistic_regression': LogisticRegression(random_state=42, max_iter=1000),
            'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'naive_bayes': MultinomialNB()
        }
        self.vectorizer = TfidfVectorizer(
            max_features=10000,
            stop_words='english',
            ngram_range=(1, 2),
            max_df=0.95,
            min_df=2
        )
        self.ps = PorterStemmer()
        self.stop_words = set(stopwords.words('english'))
        self.best_model = None
        self.best_score = 0
    
    def load_datasets(self, fake_csv_path='Fake.csv', true_csv_path='True.csv'):
        """Load and combine fake and real news datasets"""
        print("Loading datasets...")
        
        try:
            # Load fake news dataset
            fake_df = pd.read_csv(fake_csv_path)
            print(f"Loaded {len(fake_df)} fake news articles")
            
            # Load real news dataset  
            true_df = pd.read_csv(true_csv_path)
            print(f"Loaded {len(true_df)} real news articles")
            
            # Add labels: 0 for fake, 1 for real
            fake_df['label'] = 0
            true_df['label'] = 1
            
            # Combine title and text columns
            fake_df['content'] = fake_df['title'].fillna('') + ' ' + fake_df['text'].fillna('')
            true_df['content'] = true_df['title'].fillna('') + ' ' + true_df['text'].fillna('')
            
            # Combine both datasets
            combined_df = pd.concat([
                fake_df[['content', 'label']],
                true_df[['content', 'label']]
            ], ignore_index=True)
            
            # Shuffle the dataset
            combined_df = combined_df.sample(frac=1, random_state=42).reset_index(drop=True)
            
            print(f"Total articles: {len(combined_df)}")
            print(f"Fake news: {sum(combined_df['label'] == 0)}")
            print(f"Real news: {sum(combined_df['label'] == 1)}")
            
            return combined_df
            
        except FileNotFoundError as e:
            print(f"Error: {e}")
            print("Please make sure Fake.csv and True.csv files are in the current directory")
            return None
        except Exception as e:
            print(f"Error loading datasets: {e}")
            return None
    
    def preprocess_text(self, text):
        """Advanced text preprocessing"""
        if pd.isna(text) or text == '':
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove special characters and digits, keep only letters and spaces
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        
        # Remove extra whitespaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Tokenize and remove stopwords
        words = text.split()
        words = [self.ps.stem(word) for word in words if word not in self.stop_words and len(word) > 2]
        
        return ' '.join(words)
    
    def prepare_data(self, df):
        """Prepare data for training"""
        print("Preprocessing text data...")
        
        # Preprocess content
        df['processed_content'] = df['content'].apply(self.preprocess_text)
        
        # Remove rows with empty processed content
        df = df[df['processed_content'].str.len() > 10]
        
        print(f"Articles after preprocessing: {len(df)}")
        
        # Vectorize text data
        print("Vectorizing text data...")
        X = self.vectorizer.fit_transform(df['processed_content'])
        y = df['label']
        
        return X, y
    
    def train_models(self, X, y):
        """Train multiple models and select the best one"""
        print("Training models...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        results = {}
        
        for name, model in self.models.items():
            print(f"\nTraining {name}...")
            
            # Train model
            model.fit(X_train, y_train)
            
            # Make predictions
            train_pred = model.predict(X_train)
            test_pred = model.predict(X_test)
            
            # Calculate accuracies
            train_acc = accuracy_score(y_train, train_pred)
            test_acc = accuracy_score(y_test, test_pred)
            
            # Store results
            results[name] = {
                'model': model,
                'train_accuracy': train_acc,
                'test_accuracy': test_acc,
                'test_predictions': test_pred,
                'test_labels': y_test
            }
            
            print(f"Training Accuracy: {train_acc:.4f}")
            print(f"Testing Accuracy: {test_acc:.4f}")
            
            # Update best model
            if test_acc > self.best_score:
                self.best_score = test_acc
                self.best_model = model
                self.best_model_name = name
        
        return results
    
    def evaluate_best_model(self, results):
        """Evaluate the best performing model"""
        print(f"\n{'='*50}")
        print(f"BEST MODEL: {self.best_model_name.upper()}")
        print(f"{'='*50}")
        
        best_result = results[self.best_model_name]
        
        print(f"Training Accuracy: {best_result['train_accuracy']:.4f}")
        print(f"Testing Accuracy: {best_result['test_accuracy']:.4f}")
        
        # Detailed classification report
        print("\nClassification Report:")
        print(classification_report(
            best_result['test_labels'], 
            best_result['test_predictions'],
            target_names=['Fake News', 'Real News']
        ))
        
        # Confusion Matrix
        print("\nConfusion Matrix:")
        cm = confusion_matrix(best_result['test_labels'], best_result['test_predictions'])
        print(f"True Negative (Fake as Fake): {cm[0][0]}")
        print(f"False Positive (Fake as Real): {cm[0][1]}")
        print(f"False Negative (Real as Fake): {cm[1][0]}")
        print(f"True Positive (Real as Real): {cm[1][1]}")
    
    def save_model(self, save_dir='model'):
        """Save the best model and vectorizer"""
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
        
        model_path = os.path.join(save_dir, 'fake_news_model.pkl')
        vectorizer_path = os.path.join(save_dir, 'vectorizer.pkl')
        
        # Save model
        with open(model_path, 'wb') as f:
            pickle.dump(self.best_model, f)
        
        # Save vectorizer
        with open(vectorizer_path, 'wb') as f:
            pickle.dump(self.vectorizer, f)
        
        print(f"\nModel saved to: {model_path}")
        print(f"Vectorizer saved to: {vectorizer_path}")
        
        # Save model info
        info_path = os.path.join(save_dir, 'model_info.txt')
        with open(info_path, 'w') as f:
            f.write(f"Best Model: {self.best_model_name}\n")
            f.write(f"Test Accuracy: {self.best_score:.4f}\n")
            f.write(f"Vectorizer Features: {len(self.vectorizer.get_feature_names_out())}\n")
        
        print(f"Model info saved to: {info_path}")
    
    def test_sample_predictions(self, df):
        """Test the model with sample texts"""
        print(f"\n{'='*50}")
        print("SAMPLE PREDICTIONS")
        print(f"{'='*50}")
        
        # Get some sample texts
        fake_samples = df[df['label'] == 0]['content'].head(3)
        real_samples = df[df['label'] == 1]['content'].head(3)
        
        print("\nTesting FAKE NEWS samples:")
        for i, text in enumerate(fake_samples):
            processed_text = self.preprocess_text(text)
            text_vector = self.vectorizer.transform([processed_text])
            prediction = self.best_model.predict(text_vector)[0]
            probability = max(self.best_model.predict_proba(text_vector)[0])
            
            result = "REAL" if prediction == 1 else "FAKE"
            print(f"Sample {i+1}: Predicted as {result} (Confidence: {probability:.2%})")
            print(f"Text preview: {text[:100]}...")
            print("-" * 40)
        
        print("\nTesting REAL NEWS samples:")
        for i, text in enumerate(real_samples):
            processed_text = self.preprocess_text(text)
            text_vector = self.vectorizer.transform([processed_text])
            prediction = self.best_model.predict(text_vector)[0]
            probability = max(self.best_model.predict_proba(text_vector)[0])
            
            result = "REAL" if prediction == 1 else "FAKE"
            print(f"Sample {i+1}: Predicted as {result} (Confidence: {probability:.2%})")
            print(f"Text preview: {text[:100]}...")
            print("-" * 40)

def main():
    """Main training function"""
    print("🚀 Starting Fake News Model Training")
    print("=" * 50)
    
    # Initialize trainer
    trainer = FakeNewsModelTrainer()
    
    # Load datasets
    df = trainer.load_datasets()
    if df is None:
        return
    
    # Prepare data
    X, y = trainer.prepare_data(df)
    
    # Train models
    results = trainer.train_models(X, y)
    
    # Evaluate best model
    trainer.evaluate_best_model(results)
    
    # Test sample predictions
    trainer.test_sample_predictions(df)
    
    # Save model
    trainer.save_model()
    
    print(f"\n🎉 Training completed successfully!")
    print(f"Best model: {trainer.best_model_name}")
    print(f"Best accuracy: {trainer.best_score:.4f}")

if __name__ == "__main__":
    main()
