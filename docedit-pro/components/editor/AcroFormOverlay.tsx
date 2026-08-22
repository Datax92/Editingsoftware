'use client';

import React, { useEffect, useState } from 'react';
import { PDFDocument, PDFTextField } from 'pdf-lib';

interface AcroFormField {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  value: string;
}

interface AcroFormOverlayProps {
  file: File | null;
  pageNumber: number;
  scale: number;
  onFieldChange: (updatedFile: File) => void;
}

export default function AcroFormOverlay({ file, pageNumber, scale, onFieldChange }: AcroFormOverlayProps) {
  const [fields, setFields] = useState<AcroFormField[]>([]);
  const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    let isMounted = true;

    const loadFormFields = async () => {
      if (!file) return;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const form = pdfDoc.getForm();
        const pages = pdfDoc.getPages();
        const extractedFields: AcroFormField[] = [];
        const initialValues: { [key: string]: string } = {};

        const allFields = form.getFields();

        allFields.forEach((field) => {
          try {
            if (field instanceof PDFTextField) {
              const widgets = field.acroField.getWidgets();
              widgets.forEach((widget: any) => {
                const rect = widget.getRectangle();
                const widgetPageRef = widget.P();
                
                if (rect) {
                  let targetPageIndex = 0;
                  if (widgetPageRef) {
                    const foundIndex = pages.findIndex((p) => p.ref.toString() === widgetPageRef.toString());
                    if (foundIndex !== -1) targetPageIndex = foundIndex;
                  }

                  const page = pages[targetPageIndex];
                  if (page) {
                    const { height: pageHeight } = page.getSize();
                    const x = rect.x * scale;
                    const y = (pageHeight - rect.y - rect.height) * scale;
                    const fieldName = field.getName();
                    const fieldValue = field.getText() || '';

                    initialValues[fieldName] = fieldValue;

                    extractedFields.push({
                      name: fieldName,
                      x,
                      y,
                      width: rect.width * scale,
                      height: rect.height * scale,
                      pageIndex: targetPageIndex,
                      value: fieldValue,
                    });
                  }
                }
              });
            }
          } catch (e) {}
        });

        if (isMounted) {
          setFields(extractedFields);
          setFieldValues(initialValues);
        }
      } catch (error) {
        console.error("Error loading form fields:", error);
      }
    };

    loadFormFields();

    return () => {
      isMounted = false;
    };
  }, [file, scale]);

  const handleInputChange = (fieldName: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleFieldBlur = async (fieldName: string, value: string) => {
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const form = pdfDoc.getForm();
      
      const textField = form.getTextField(fieldName);
      textField.setText(value);

      const modifiedBytes = await pdfDoc.save();
      const newFile = new File([modifiedBytes.buffer as ArrayBuffer], file.name || 'document.pdf', { type: 'application/pdf' });
      onFieldChange(newFile);
    } catch (error) {
      console.error("Failed to update form field:", error);
    }
  };

  const currentFilteredFields = fields.filter((f) => f.pageIndex === pageNumber - 1);

  if (currentFilteredFields.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {currentFilteredFields.map((field) => (
        <input
          key={field.name}
          type="text"
          value={fieldValues[field.name] ?? field.value}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          onBlur={(e) => handleFieldBlur(field.name, e.target.value)}
          style={{
            left: `${field.x}px`,
            top: `${field.y}px`,
            width: `${field.width}px`,
            height: `${field.height}px`,
          }}
          className="absolute pointer-events-auto bg-white/95 dark:bg-zinc-900/95 border border-blue-500 rounded px-1.5 text-xs text-foreground shadow-md focus:bg-background focus:ring-2 focus:ring-primary focus:outline-hidden transition-all z-50"
        />
      ))}
    </div>
  );
}