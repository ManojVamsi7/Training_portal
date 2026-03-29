'use client';
import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useResume } from '@/lib/ResumeContext';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXT = ['.pdf', '.docx'];

export default function UploadResume() {
  const { resume, setResume } = useResume();
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError('');
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
        setError('Please upload a PDF or DOCX file.');
        return;
      }
      setResume({ name: file.name, blob: file, type: file.type });
    },
    [setResume]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="upload-resume-panel">
      <div className="upload-resume-header">
        <FileText size={18} />
        <span>Training Resume</span>
      </div>

      {resume ? (
        <div className="resume-uploaded-state">
          <div className="resume-file-row">
            <CheckCircle size={16} className="text-green-500" />
            <span className="resume-filename" title={resume.name}>
              {resume.name}
            </span>
            <button
              className="resume-clear-btn"
              onClick={() => setResume(null)}
              title="Remove resume"
            >
              <X size={14} />
            </button>
          </div>
          <p className="resume-success-label">Resume uploaded ✓</p>
          <button
            className="btn-upload-new"
            onClick={() => inputRef.current?.click()}
          >
            Replace Resume
          </button>
        </div>
      ) : (
        <div
          className={`upload-dropzone${dragOver ? ' dragover' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <Upload size={24} className="upload-icon" />
          <p className="upload-main-text">Drop your resume here</p>
          <p className="upload-sub-text">PDF or DOCX • Click to browse</p>
        </div>
      )}

      {error && (
        <div className="upload-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={onInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
