// compareFile.test.ts

const fs = require('fs');
const { compareFile } = require('../src/main/services/achievements/achievement-watcher-manager'); // Atualize o caminho para o arquivo compareFile
const fileStats = new Map(); // Simulando o fileStats

jest.mock('fs'); // Mockando o fs



describe('compareFile', () => {
  const game = {}; // Simulação do objeto game
  const file = {
    type: 'flt',
    filePath: '/path/to/file',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call compareFltFolder when file.type is Cracker.flt', () => {
    file.type = 'flt'; // Certifique-se de que a condição file.type === Cracker.flt seja verdadeira
    compareFile(game, file);
    
    const { compareFltFolder } = require('../src/main/services/achievements/compareFltFolder');
    expect(compareFltFolder).toHaveBeenCalledWith(game, file);
  });

  it('should call processAchievementFileDiff when first change in file', () => {
    const mockStat = { mtimeMs: 1627864374000 };
    fs.statSync.mockReturnValue(mockStat); // Mock para fs.statSync

    fileStats.set(file.filePath, -1); // Simulando que previousStat não existe
    compareFile(game, file);
    
    const { processAchievementFileDiff } = require('../src/main/services/achievements/processAchievementFileDiff');
    expect(processAchievementFileDiff).toHaveBeenCalledWith(game, file);
    expect(fileStats.get(file.filePath)).toBe(mockStat.mtimeMs); // Verificando se o fileStats foi atualizado
  });

  it('should not call processAchievementFileDiff when previousStat is equal to currentStat.mtimeMs', () => {
    const mockStat = { mtimeMs: 1627864374000 };
    fs.statSync.mockReturnValue(mockStat);

    fileStats.set(file.filePath, mockStat.mtimeMs); // Simulando que previousStat é igual a currentStat.mtimeMs
    compareFile(game, file);
    
    const { processAchievementFileDiff } = require('../src/main/services/achievements/processAchievementFileDiff');
    expect(processAchievementFileDiff).not.toHaveBeenCalled(); // Não deve chamar processAchievementFileDiff
  });

  it('should log "First change in file" when previousStat is undefined', () => {
    const mockStat = { mtimeMs: 1627864374000 };
    fs.statSync.mockReturnValue(mockStat);

    fileStats.set(file.filePath, undefined); // Simulando que previousStat é undefined
    compareFile(game, file);
    
    const { achievementsLogger } = require('../src/main/services/achievements/achievementsLogger');
    expect(achievementsLogger.log).toHaveBeenCalledWith(
      'First change in file',
      file.filePath,
      undefined,
      mockStat.mtimeMs
    );
  });

  it('should catch error and set fileStats to -1 if fs.statSync throws an error', () => {
    fs.statSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    compareFile(game, file);

    expect(fileStats.get(file.filePath)).toBe(-1); // Verifica se o fileStats foi atualizado para -1
  });
});
