import React from 'react';
import { Box } from '@adminjs/design-system';

const ImageList = (props) => {
  // 1. Get the 'record' (the current row)
  const { record } = props;
  
  // 2. Get the images array from the record params
  // AdminJS flattens arrays, so we check for 'images.0' (the first image)
  const firstImage = record.params['images.0'] || record.params['images'];

  if (!firstImage || typeof firstImage !== 'string') {
    return <Box>No Image</Box>;
  }

  // 3. Logic: If it's a full URL, use it. If it's a filename, prepend /uploads/
  const imageUrl = firstImage.startsWith('http') 
    ? firstImage 
    : `/uploads/${firstImage}`;

  return (
    <Box>
      <img 
        src={imageUrl} 
        alt="Product" 
        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} 
      />
    </Box>
  );
};

export default ImageList;