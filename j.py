import pandas as pd
import plotly.express as px
import seaborn as sns
import matplotlib.pyplot as plt

# Load Cloud dataset from UCI Repository
url = "https://archive.ics.uci.edu/ml/machine-learning-databases/undocumented/taylor/cloud.data"
column_names = ["vis_mean", "vis_max", "vis_min", "vis_mean_dist", "vis_contrast", "vis_entropy",
                "vis_second_moment", "ir_mean", "ir_max", "ir_min"]

# Use the 'on_bad_lines='skip'' argument to skip problematic lines
df = pd.read_csv(url, delim_whitespace=True, names=column_names, on_bad_lines='skip')

# Skip the first 5 rows which seem to contain header information
df = df[5:]  # This line is added to skip the first 5 rows

# Reset index to start from 0
df = df.reset_index(drop=True)  # This line is added to reset the index

# Convert 'vis_mean' column to numeric, coercing errors to NaN
df['vis_mean'] = pd.to_numeric(df['vis_mean'], errors='coerce')

# Remove rows with NaN values in 'vis_mean'
df = df.dropna(subset=['vis_mean'])

# Show first few rows
print(df.head())

# Scatter Matrix (Pairplot) - Shows relationships between features
sns.pairplot(df)
plt.show()

# Parallel Coordinates Plot - Shows patterns in multivariate data
fig_parallel = px.parallel_coordinates(df, dimensions=df.columns, color="vis_mean")
fig_parallel.show()

# Linked Scatter Plot - Comparing visible mean vs infrared mean
fig_scatter = px.scatter(df, x="vis_mean", y="ir_mean", color="vis_entropy",
                         title="Linked Scatter Plot: Visible Mean vs Infrared Mean")
fig_scatter.show()

# Histograms of all features
for col in df.columns:
    fig_hist = px.histogram(df, x=col, title=f"Histogram of {col}")
    fig_hist.show()
